// feeds/otx.js – fetch latest threats from AlienVault OTX public API
const axios = require('axios');
require('dotenv').config();

// OTX provides a public endpoint for pulses (threat intel collections).
// We'll fetch the latest pulses and map each indicator to our canonical threat object.
// If you have an OTX API key, set OTX_API_KEY in .env; otherwise the public endpoint works with rate limits.

const OTX_BASE = 'https://otx.alienvault.com/api/v1';
const API_KEY = process.env.OTX_API_KEY; // optional
const TIMEOUT = 8000; // 8 second timeout
const URLHAUS_RECENT = 'https://urlhaus.abuse.ch/downloads/json_recent/';

async function getPulses(headers) {
  const pulseEndpoints = [
    { path: '/pulses/public', params: { limit: 3 } },
    { path: '/pulses/subscribed', params: { limit: 3 } },
  ];

  for (const endpoint of pulseEndpoints) {
    try {
      const response = await axios.get(`${OTX_BASE}${endpoint.path}`, {
        headers,
        params: endpoint.params,
        timeout: TIMEOUT,
      });
      const pulses = response?.data?.results || [];
      if (Array.isArray(pulses)) {
        return pulses;
      }
    } catch (err) {
      const status = err?.response?.status;
      console.warn(`[OTX] Pulse endpoint ${endpoint.path} failed${status ? ` (${status})` : ''}:`, err.message);
    }
  }

  return [];
}

async function getIndicatorsForPulse(pulseId, headers) {
  const indicatorEndpoints = [
    `/pulses/${pulseId}/indicators`,
    `/pulses/${pulseId}`,
  ];

  for (const endpoint of indicatorEndpoints) {
    try {
      const response = await axios.get(`${OTX_BASE}${endpoint}`, {
        headers,
        timeout: TIMEOUT,
        params: { limit: 10 },
      });

      if (endpoint.endsWith('/indicators')) {
        const rows = response?.data?.results || [];
        return Array.isArray(rows) ? rows : [];
      }

      const detailIndicators = response?.data?.indicators || [];
      return Array.isArray(detailIndicators) ? detailIndicators : [];
    } catch (err) {
      const status = err?.response?.status;
      console.warn(`[OTX] Indicator endpoint ${endpoint} failed${status ? ` (${status})` : ''}:`, err.message);
    }
  }

  return [];
}

async function getUrlhausRecent() {
  try {
    const response = await axios.get(URLHAUS_RECENT, { timeout: TIMEOUT });
    const rows = Array.isArray(response.data) ? response.data : [];
    return rows.slice(0, 40).map((row) => {
      const created = row.date_added || row.dateadded || new Date().toISOString();
      return {
        indicator: row.url,
        type: 'url',
        source: 'URLHAUS:recent',
        timestamp: created,
        raw_json: row,
      };
    }).filter((row) => typeof row.indicator === 'string' && row.indicator.length > 0);
  } catch (err) {
    const status = err?.response?.status;
    console.warn(`[URLHAUS] Fallback feed failed${status ? ` (${status})` : ''}:`, err.message);
    return [];
  }
}

// Test threat indicators (used if API fails or for demo)
const TEST_INDICATORS = [
  { indicator: '192.0.2.10', type: 'IPv4', name: 'Malicious IP from test block' },
  { indicator: '198.51.100.42', type: 'IPv4', name: 'C2 Server IP' },
  { indicator: 'malware.example.com', type: 'domain', name: 'Phishing domain' },
  { indicator: '5d41402abc4b2a76b9719d911017c592', type: 'file', name: 'Known malware hash' },
];

/** Normalize a raw OTX indicator into our standard shape */
function normalize(indicator, source = 'OTX', created = new Date().toISOString()) {
  return {
    indicator: indicator.indicator || indicator,
    type: indicator.type || 'unknown',
    source: source || 'OTX',
    timestamp: created,
    raw_json: { indicator, source }
  };
}

/** Fetch latest pulses and flatten their indicators */
async function fetchLatest() {
  try {
    console.log('[OTX] Fetching latest threat indicators...');
    const headers = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};

    const pulses = await getPulses(headers);
    if (pulses.length === 0) {
      throw new Error('No pulses could be fetched from OTX endpoints.');
    }

    console.log(`[OTX] Found ${pulses.length} pulses`);

    const allIndicators = [];

    for (const pulse of pulses) {
      try {
        const indicators = await getIndicatorsForPulse(pulse.id, headers);
        const pulseName = pulse.name || pulse.id;

        for (const ind of indicators) {
          allIndicators.push(normalize(ind, `OTX:${pulseName}`, ind.created || new Date().toISOString()));
        }
      } catch (err) {
        console.warn(`[OTX] Failed to fetch indicators for pulse ${pulse.id}:`, err.message);
        // Continue with next pulse
      }
    }
    
    console.log(`[OTX] Successfully fetched ${allIndicators.length} indicators`);
    return allIndicators;
  } catch (err) {
    console.warn('[OTX] API fetch error:', err.message);
    const urlhausIndicators = await getUrlhausRecent();
    if (urlhausIndicators.length > 0) {
      console.log(`[URLHAUS] Using ${urlhausIndicators.length} real fallback indicators`);
      return urlhausIndicators;
    }

    console.warn('[OTX] and URLHAUS unavailable, falling back to test indicators.');
    // Return test indicators so the system keeps working
    return TEST_INDICATORS.map((ind, idx) =>
      normalize(ind, 'OTX-TEST', new Date(Date.now() - idx * 60000).toISOString())
    );
  }
}

module.exports = { fetchLatest };
