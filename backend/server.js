// server.js – Express + Socket.io entry point
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { requireAuth } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // adjust in production
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function parseThreatId(rawId) {
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Invalid threat id. Expected a positive integer.');
  }
  return id;
}

function parseEntityId(rawId, label = 'id') {
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `Invalid ${label}. Expected a positive integer.`);
  }
  return id;
}

function ensureNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${fieldName} is required and must be a non-empty string.`);
  }
}

function parseLimit(rawLimit, defaultLimit = 50, maxLimit = 200) {
  const parsed = Number.parseInt(rawLimit, 10);
  if (Number.isNaN(parsed)) {
    return defaultLimit;
  }
  return Math.min(Math.max(parsed, 1), maxLimit);
}

function parseSeverityFilter(value) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  switch (normalized) {
    case 'critical':
      return { min: 80, max: 100 };
    case 'high':
      return { min: 60, max: 79 };
    case 'medium':
      return { min: 40, max: 59 };
    case 'low':
      return { min: 20, max: 39 };
    default:
      throw new HttpError(400, `Unsupported severity filter: ${value}`);
  }
}

function parseBooleanFlag(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  throw new HttpError(400, `Invalid boolean value: ${value}`);
}

function validateThreatPayload(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'Payload must be a JSON object.');
  }

  const allowedFields = new Set(['indicator', 'type', 'source', 'timestamp', 'raw_json']);
  const keys = Object.keys(payload);

  for (const key of keys) {
    if (!allowedFields.has(key)) {
      throw new HttpError(400, `Unsupported field: ${key}`);
    }
  }

  if (partial && keys.length === 0) {
    throw new HttpError(400, 'At least one updatable field is required.');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'indicator')) {
    ensureNonEmptyString(payload.indicator, 'indicator');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'type')) {
    ensureNonEmptyString(payload.type, 'type');
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'source')) {
    ensureNonEmptyString(payload.source, 'source');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'timestamp')) {
    const parsedTimestamp = Date.parse(payload.timestamp);
    if (Number.isNaN(parsedTimestamp)) {
      throw new HttpError(400, 'timestamp must be a valid ISO date string.');
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'raw_json')) {
    if (typeof payload.raw_json !== 'object' || payload.raw_json === null || Array.isArray(payload.raw_json)) {
      throw new HttpError(400, 'raw_json must be a JSON object.');
    }
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Threats endpoint – fetch recent threats from Supabase
const {
  init,
  getRecent,
  addThreat,
  getById,
  updateById,
  deleteById,
  getThreatActions,
  getThreatActionsWithCount,
  getThreatActionById,
  updateThreatAction,
  getBlockedIndicatorsWithCount,
  addBlockedIndicator,
  updateBlockedIndicator,
  deactivateBlockedIndicators,
  getEliminationRules,
  addEliminationRule,
  updateEliminationRule,
  deleteEliminationRule,
  getEliminationStats
} = require('./db');

app.get('/api/threats', asyncHandler(async (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10);
  const threats = await getRecent(Number.isNaN(limit) ? 20 : limit);
  res.json(threats);
}));

app.post('/api/threats', requireAuth, asyncHandler(async (req, res) => {
  validateThreatPayload(req.body);
  const createdThreat = await addThreat(req.body);
  res.status(201).json(createdThreat);
}));

app.get('/api/threats/:id', asyncHandler(async (req, res) => {
  const id = parseThreatId(req.params.id);
  const threat = await getById(id);
  if (!threat) {
    throw new HttpError(404, 'Threat not found.');
  }
  res.json(threat);
}));

app.put('/api/threats/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = parseThreatId(req.params.id);
  validateThreatPayload(req.body, { partial: true });
  const updatedThreat = await updateById(id, req.body);
  if (!updatedThreat) {
    throw new HttpError(404, 'Threat not found.');
  }
  res.json(updatedThreat);
}));

app.delete('/api/threats/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = parseThreatId(req.params.id);
  const deleted = await deleteById(id);
  if (!deleted) {
    throw new HttpError(404, 'Threat not found.');
  }
  res.status(204).send();
}));

// ==================== ELIMINATION ACTIONS ROUTES ====================

// GET /api/threats/:id/actions - Get all actions taken on a specific threat
app.get('/api/threats/:id/actions', asyncHandler(async (req, res) => {
  const id = parseThreatId(req.params.id);
  const actions = await getThreatActions({ threatId: id });
  res.json({ actions });
}));

// GET /api/actions - List all elimination actions with optional filters
app.get('/api/actions', asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 50, 200);
  const status = req.query.status;
  const severityRange = parseSeverityFilter(req.query.severity);

  const { data, count } = await getThreatActionsWithCount({
    status,
    limit,
    minScore: severityRange ? severityRange.min : undefined,
    maxScore: severityRange ? severityRange.max : undefined
  });

  res.json({ actions: data, total: count });
}));

// POST /api/actions/:id/revert - Revert an elimination action
app.post('/api/actions/:id/revert', requireAuth, asyncHandler(async (req, res) => {
  const id = parseEntityId(req.params.id, 'action id');
  const action = await getThreatActionById(id);
  if (!action) {
    throw new HttpError(404, 'Action not found.');
  }
  if (action.status !== 'executed') {
    throw new HttpError(400, 'Can only revert executed actions');
  }

  const updatedAction = await updateThreatAction(id, {
    status: 'reverted',
    reverted_at: new Date().toISOString()
  });

  if (['block_ip', 'quarantine_domain', 'flag_hash'].includes(action.action_type)) {
    const threat = await getById(action.threat_id);
    if (threat) {
      await deactivateBlockedIndicators(threat.indicator, threat.type);
    }
  }

  io.emit('actionReverted', {
    action: updatedAction
  });

  res.json({ action: updatedAction, message: 'Action reverted successfully' });
}));

// GET /api/blocklist - Get current active blocklist
app.get('/api/blocklist', asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 100, 500);
  const type = req.query.type;
  const { data, count } = await getBlockedIndicatorsWithCount({
    type,
    isActive: true,
    limit
  });
  res.json({ blocklist: data, total: count });
}));

// POST /api/blocklist - Manually add to blocklist
app.post('/api/blocklist', requireAuth, asyncHandler(async (req, res) => {
  const { indicator, type, reason, expires_at } = req.body || {};

  ensureNonEmptyString(indicator, 'indicator');
  ensureNonEmptyString(type, 'type');

  let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (expires_at) {
    const parsed = Date.parse(expires_at);
    if (Number.isNaN(parsed)) {
      throw new HttpError(400, 'expires_at must be a valid ISO date string.');
    }
    expiresAt = new Date(parsed);
  }

  const entry = await addBlockedIndicator({
    indicator,
    type,
    reason: typeof reason === 'string' && reason.trim() ? reason.trim() : 'Manual block',
    blocked_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    is_active: true
  });

  io.emit('blocklist:updated', { entry });
  res.status(201).json({ entry, message: 'Added to blocklist' });
}));

// DELETE /api/blocklist/:id - Remove from blocklist (soft delete)
app.delete('/api/blocklist/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = parseEntityId(req.params.id, 'blocklist id');
  const updated = await updateBlockedIndicator(id, { is_active: false });
  if (!updated) {
    throw new HttpError(404, 'Blocklist entry not found.');
  }

  io.emit('blocklist:updated', { entry: updated });
  res.json({ message: 'Removed from blocklist' });
}));

// GET /api/rules - List all elimination rules
app.get('/api/rules', asyncHandler(async (req, res) => {
  const activeOnly = parseBooleanFlag(req.query.active_only);
  const rules = await getEliminationRules({ isActive: activeOnly === true });
  res.json({ rules });
}));

// POST /api/rules - Create new elimination rule
app.post('/api/rules', requireAuth, asyncHandler(async (req, res) => {
  const { name, conditions, action_type, is_active, priority } = req.body || {};

  ensureNonEmptyString(name, 'name');
  ensureNonEmptyString(action_type, 'action_type');

  if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions)) {
    throw new HttpError(400, 'conditions must be a JSON object.');
  }

  const rule = await addEliminationRule({
    name,
    conditions,
    action_type,
    is_active: is_active !== undefined ? Boolean(is_active) : true,
    priority: Number.isInteger(priority) ? priority : 999
  });

  res.status(201).json({ rule });
}));

// PUT /api/rules/:id - Update a rule
app.put('/api/rules/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = parseEntityId(req.params.id, 'rule id');
  const updates = {};
  const payload = req.body || {};
  const allowedFields = new Set(['name', 'conditions', 'action_type', 'is_active', 'priority']);

  for (const key of Object.keys(payload)) {
    if (!allowedFields.has(key)) {
      throw new HttpError(400, `Unsupported field: ${key}`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    ensureNonEmptyString(payload.name, 'name');
    updates.name = payload.name;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'conditions')) {
    if (!payload.conditions || typeof payload.conditions !== 'object' || Array.isArray(payload.conditions)) {
      throw new HttpError(400, 'conditions must be a JSON object.');
    }
    updates.conditions = payload.conditions;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'action_type')) {
    ensureNonEmptyString(payload.action_type, 'action_type');
    updates.action_type = payload.action_type;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'is_active')) {
    updates.is_active = Boolean(payload.is_active);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'priority')) {
    if (!Number.isInteger(payload.priority)) {
      throw new HttpError(400, 'priority must be an integer.');
    }
    updates.priority = payload.priority;
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, 'At least one updatable field is required.');
  }

  const rule = await updateEliminationRule(id, updates);
  res.json({ rule });
}));

// DELETE /api/rules/:id - Delete a rule
app.delete('/api/rules/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = parseEntityId(req.params.id, 'rule id');
  await deleteEliminationRule(id);
  res.json({ message: 'Rule deleted' });
}));

// GET /api/stats/elimination - Get elimination statistics
app.get('/api/stats/elimination', asyncHandler(async (req, res) => {
  const stats = await getEliminationStats();
  res.json(stats);
}));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  // You can emit a welcome or send latest data here
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
const { startPoller, runPollerCycle } = require('./poller');

app.post('/api/poller/run', asyncHandler(async (req, res) => {
  const result = await runPollerCycle(io, 'live-hunt');
  if (result.status === 'busy') {
    return res.status(409).json(result);
  }

  if (result.status === 'error') {
    return res.status(500).json(result);
  }

  return res.status(200).json(result);
}));

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) {
    console.error('Unhandled server error:', err);
  }

  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

async function startServer() {
  try {
    await init();
    server.listen(PORT, () => {
      console.log(`Backend server listening on http://localhost:${PORT}`);
    });
    startPoller(io);
  } catch (err) {
    console.error('DB init failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

// Export for external use (e.g., tests or other modules)
module.exports = { app, io, server, startServer };
