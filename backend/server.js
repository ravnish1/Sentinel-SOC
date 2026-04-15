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

function ensureNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${fieldName} is required and must be a non-empty string.`);
  }
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
const { init, getRecent, addThreat, getById, updateById, deleteById } = require('./db');

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

