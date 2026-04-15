// db.js – Supabase PostgreSQL wrapper
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Supabase connection – expect env vars SUPABASE_URL and SUPABASE_KEY
let supabase;
let readClient;
let writeClient;

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
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  return error && (error.code === 'PGRST116' || error.code === '42P01');
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

module.exports = { init, addThreat, getRecent, getById, updateById, deleteById, ensureWriteConfigured };
