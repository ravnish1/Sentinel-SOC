require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

let authClient;

function getAuthClient() {
  if (authClient) {
    return authClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY must be set for auth middleware.');
  }

  authClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return authClient;
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token.' });
  }

  try {
    const client = getAuthClient();
    const { data, error } = await client.auth.getUser(token);

    if (error || !data || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.context = {
      ...(req.context || {}),
      user: data.user
    };

    return next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ error: 'Authentication service unavailable.' });
  }
}

module.exports = { requireAuth };
