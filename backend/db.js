// db.js – Supabase PostgreSQL wrapper
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Supabase connection – expect env vars SUPABASE_URL and SUPABASE_KEY
let supabase;
let readClient;
let writeClient;

const DEFAULT_ELIMINATION_RULES = [
  { name: 'Auto-block critical IPs', conditions: { type: 'ip', min_score: 80 }, action_type: 'block_ip', is_active: true, priority: 1 },
  { name: 'Quarantine suspicious domains', conditions: { type: 'domain', min_score: 60 }, action_type: 'quarantine_domain', is_active: true, priority: 2 },
  { name: 'Flag malicious hashes', conditions: { type: 'hash', min_score: 50 }, action_type: 'flag_hash', is_active: true, priority: 3 },
  { name: 'Alert on all new URLs', conditions: { type: 'url', min_score: 0 }, action_type: 'alert_only', is_active: true, priority: 4 },
  { name: 'Block repeated offenders', conditions: { min_score: 90 }, action_type: 'block_ip', is_active: true, priority: 0 }
];

function getSupabase() {
  if (supabase) {
    return supabase;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and key not set in .env (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY).');
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

function getReadClient() {
  if (readClient) {
    return readClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!supabaseUrl || !key) {
    throw new Error('Supabase URL and read key not set in .env (SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY).');
  }

  readClient = createClient(supabaseUrl, key);
  return readClient;
}

function getWriteClient() {
  if (writeClient) {
    return writeClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for backend write operations under RLS.');
  }

  writeClient = createClient(supabaseUrl, serviceRoleKey);
  return writeClient;
}

function ensureWriteConfigured() {
  return getWriteClient();
}

function isNotFoundError(error) {
  return error && (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST205');
}

/** Ensure the threats table exists. */
async function init() {
  const client = getReadClient();
  // Verify table connectivity on startup.
  const { error } = await client.from('threats').select('id').limit(1);
  if (error) {
    console.error('Failed to access threats table:', error.message);
    if (isNotFoundError(error)) {
      throw new Error('Table "threats" not found. Create it in Supabase before starting the backend.');
    }
    throw error;
  }

  await seedDefaultRules();
}

async function seedDefaultRules() {
  const client = getReadClient();
  const { count, error } = await client
    .from('elimination_rules')
    .select('id', { count: 'exact', head: true });

  if (error) {
    if (isNotFoundError(error)) {
      console.warn('Elimination rules table not found yet; skipping default rule seed.');
      return;
    }
    console.error('Failed to check elimination rules:', error.message);
    throw error;
  }

  if (count && count > 0) {
    return;
  }

  const write = getWriteClient();
  const { error: insertError } = await write
    .from('elimination_rules')
    .insert(DEFAULT_ELIMINATION_RULES);

  if (insertError) {
    if (isNotFoundError(insertError)) {
      console.warn('Elimination rules table not found yet; skipping default rule seed.');
      return;
    }
    console.error('Failed to seed default elimination rules:', insertError.message);
    throw insertError;
  }
}

/** Insert a threat object.
 * @param {Object} threat – {indicator, type, source, timestamp?, raw_json}
 */
async function addThreat(threat) {
  const client = getWriteClient();
  const payload = {
    indicator: threat.indicator,
    type: threat.type,
    source: threat.source,
    timestamp: threat.timestamp || new Date().toISOString(),
    raw_json: threat.raw_json || {}
  };
  const { data, error } = await client
    .from('threats')
    .insert([payload])
    .select('*')
    .single();
  if (error) {
    console.error('addThreat error:', error.message);
    throw error;
  }
  return data;
}

/** Retrieve most recent threats.
 * @param {number} limit – how many rows to fetch (default 20)
 */
async function getRecent(limit = 20) {
  const client = getReadClient();
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
  const { data, error } = await client
    .from('threats')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(safeLimit);
  if (error) {
    console.error('getRecent error:', error.message);
    throw error;
  }
  return data;
}

async function getById(id) {
  const client = getReadClient();
  const { data, error } = await client
    .from('threats')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    console.error('getById error:', error.message);
    throw error;
  }

  return data;
}

async function updateById(id, updates) {
  const client = getWriteClient();
  const payload = {};
  const fields = ['indicator', 'type', 'source', 'timestamp', 'raw_json'];

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      payload[field] = updates[field];
    }
  }

  const { data, error } = await client
    .from('threats')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    console.error('updateById error:', error.message);
    throw error;
  }

  return data;
}

async function deleteById(id) {
  const client = getWriteClient();
  const { data, error } = await client
    .from('threats')
    .delete()
    .eq('id', id)
    .select('id')
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    console.error('deleteById error:', error.message);
    throw error;
  }

  return data;
}

/** Threat Actions */
async function getThreatActions(params = {}) {
  const client = getReadClient();
  let query = client.from('threat_actions').select('*');

  if (params.threatId) {
    query = query.eq('threat_id', params.threatId);
  }
  if (params.actionType) {
    query = query.eq('action_type', params.actionType);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.minScore !== undefined) {
    query = query.gte('severity_score', params.minScore);
  }
  if (params.maxScore !== undefined) {
    query = query.lte('severity_score', params.maxScore);
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + params.limit - 1);
  }

  const { data, error } = await query.order('executed_at', { ascending: false });
  if (error) {
    console.error('getThreatActions error:', error.message);
    throw error;
  }
  return data;
}

async function getThreatActionsWithCount(params = {}) {
  const client = getReadClient();
  let query = client.from('threat_actions').select('*', { count: 'exact' });

  if (params.threatId) {
    query = query.eq('threat_id', params.threatId);
  }
  if (params.actionType) {
    query = query.eq('action_type', params.actionType);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.minScore !== undefined) {
    query = query.gte('severity_score', params.minScore);
  }
  if (params.maxScore !== undefined) {
    query = query.lte('severity_score', params.maxScore);
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + params.limit - 1);
  }

  const { data, error, count } = await query.order('executed_at', { ascending: false });
  if (error) {
    console.error('getThreatActionsWithCount error:', error.message);
    throw error;
  }
  return { data, count: count || 0 };
}

async function getThreatActionById(id) {
  const client = getReadClient();
  const { data, error } = await client
    .from('threat_actions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    console.error('getThreatActionById error:', error.message);
    throw error;
  }

  return data;
}

async function addThreatAction(action) {
  const client = getWriteClient();
  const { data, error } = await client
    .from('threat_actions')
    .insert([action])
    .select()
    .single();
  if (error) {
    console.error('addThreatAction error:', error.message);
    throw error;
  }
  return data;
}

async function updateThreatAction(id, updates) {
  const client = getWriteClient();
  const { data, error } = await client
    .from('threat_actions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('updateThreatAction error:', error.message);
    throw error;
  }
  return data;
}

/** Elimination Rules */
async function getEliminationRules(params = {}) {
  const client = getReadClient();
  let query = client.from('elimination_rules').select('*');

  if (params.isActive !== undefined) {
    query = query.eq('is_active', params.isActive);
  }
  if (params.priority) {
    query = query.order('priority', { ascending: true });
  }

  const { data, error } = await query;
  if (error) {
    console.error('getEliminationRules error:', error.message);
    throw error;
  }
  return data;
}

async function addEliminationRule(rule) {
  const client = getWriteClient();
  const { data, error } = await client
    .from('elimination_rules')
    .insert([rule])
    .select()
    .single();
  if (error) {
    console.error('addEliminationRule error:', error.message);
    throw error;
  }
  return data;
}

async function updateEliminationRule(id, updates) {
  const client = getWriteClient();
  const { data, error } = await client
    .from('elimination_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('updateEliminationRule error:', error.message);
    throw error;
  }
  return data;
}

async function deleteEliminationRule(id) {
  const client = getWriteClient();
  const { error } = await client
    .from('elimination_rules')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('deleteEliminationRule error:', error.message);
    throw error;
  }
}

/** Blocked Indicators */
async function getBlockedIndicators(params = {}) {
  const client = getReadClient();
  let query = client.from('blocked_indicators').select('*');

  if (params.indicator) {
    query = query.eq('indicator', params.indicator);
  }
  if (params.type) {
    query = query.eq('type', params.type);
  }
  if (params.isActive !== undefined) {
    query = query.eq('is_active', params.isActive);
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getBlockedIndicators error:', error.message);
    throw error;
  }
  return data;
}

async function getBlockedIndicatorsWithCount(params = {}) {
  const client = getReadClient();
  let query = client.from('blocked_indicators').select('*', { count: 'exact' });

  if (params.indicator) {
    query = query.eq('indicator', params.indicator);
  }
  if (params.type) {
    query = query.eq('type', params.type);
  }
  if (params.isActive !== undefined) {
    query = query.eq('is_active', params.isActive);
  }
  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('getBlockedIndicatorsWithCount error:', error.message);
    throw error;
  }
  return { data, count: count || 0 };
}

async function addBlockedIndicator(indicator) {
  const client = getWriteClient();
  const { data, error } = await client
    .from('blocked_indicators')
    .insert([indicator])
    .select()
    .single();
  if (error) {
    console.error('addBlockedIndicator error:', error.message);
    throw error;
  }
  return data;
}

async function updateBlockedIndicator(id, updates) {
  const client = getWriteClient();
  const { data, error } = await client
    .from('blocked_indicators')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    console.error('updateBlockedIndicator error:', error.message);
    throw error;
  }
  return data;
}

async function deactivateBlockedIndicators(indicator, type) {
  const client = getWriteClient();
  let query = client
    .from('blocked_indicators')
    .update({ is_active: false })
    .eq('indicator', indicator)
    .eq('is_active', true);

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query.select();
  if (error) {
    console.error('deactivateBlockedIndicators error:', error.message);
    throw error;
  }
  return data;
}

async function deleteBlockedIndicator(id) {
  const client = getWriteClient();
  const { error } = await client
    .from('blocked_indicators')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('deleteBlockedIndicator error:', error.message);
    throw error;
  }
}

/** Statistics */
async function getEliminationStats() {
  const client = getReadClient();
  const severityRanges = {
    critical: { min: 80, max: 100 },
    high: { min: 60, max: 79 },
    medium: { min: 40, max: 59 },
    low: { min: 20, max: 39 }
  };

  const { count: totalActions, error: totalActionsError } = await client
    .from('threat_actions')
    .select('id', { count: 'exact', head: true });
  if (totalActionsError) throw totalActionsError;

  const actionsByType = {
    block_ip: 0,
    quarantine_domain: 0,
    flag_hash: 0,
    alert_only: 0
  };

  for (const actionType of Object.keys(actionsByType)) {
    const { count, error } = await client
      .from('threat_actions')
      .select('id', { count: 'exact', head: true })
      .eq('action_type', actionType);
    if (error) throw error;
    actionsByType[actionType] = count || 0;
  }

  const actionsBySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  for (const [severity, range] of Object.entries(severityRanges)) {
    const { count, error } = await client
      .from('threat_actions')
      .select('id', { count: 'exact', head: true })
      .gte('severity_score', range.min)
      .lte('severity_score', range.max);
    if (error) throw error;
    actionsBySeverity[severity] = count || 0;
  }

  const { count: blocklistSize, error: blocklistError } = await client
    .from('blocked_indicators')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (blocklistError) throw blocklistError;

  const { count: activeRules, error: activeRulesError } = await client
    .from('elimination_rules')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (activeRulesError) throw activeRulesError;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: eliminatedToday, error: eliminatedTodayError } = await client
    .from('threat_actions')
    .select('id', { count: 'exact', head: true })
    .gte('executed_at', today.toISOString());
  if (eliminatedTodayError) throw eliminatedTodayError;

  const { count: totalThreats, error: totalThreatsError } = await client
    .from('threats')
    .select('id', { count: 'exact', head: true });
  if (totalThreatsError) throw totalThreatsError;

  const eliminationRate = totalThreats
    ? Number(((totalActions / totalThreats) * 100).toFixed(1))
    : 0;

  return {
    total_actions: totalActions || 0,
    actions_by_type: actionsByType,
    actions_by_severity: actionsBySeverity,
    blocklist_size: blocklistSize || 0,
    active_rules: activeRules || 0,
    threats_eliminated_today: eliminatedToday || 0,
    elimination_rate: eliminationRate
  };
}

module.exports = {
  init,
  addThreat,
  getRecent,
  getById,
  updateById,
  deleteById,
  ensureWriteConfigured,
  getReadClient,
  getWriteClient,
  // Threat Actions
  getThreatActions,
  getThreatActionsWithCount,
  getThreatActionById,
  addThreatAction,
  updateThreatAction,
  // Elimination Rules
  getEliminationRules,
  addEliminationRule,
  updateEliminationRule,
  deleteEliminationRule,
  // Blocked Indicators
  getBlockedIndicators,
  getBlockedIndicatorsWithCount,
  addBlockedIndicator,
  updateBlockedIndicator,
  deactivateBlockedIndicators,
  deleteBlockedIndicator,
  // Statistics
  getEliminationStats
};
