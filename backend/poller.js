// poller.js – on-demand ingestion of threat feeds and real-time broadcast
const { addThreat, ensureWriteConfigured } = require('./db');
const { fetchLatest: fetchOTX } = require('./feeds/otx');
// You can import additional feeds here, e.g. const { fetchLatest: fetchAbuseIPDB } = require('./feeds/abuseipdb');

/** Simple in‑memory set to dedupe indicators during a single poll run */
const seen = new Set();
let isRunning = false;

async function ingestFeed(fetchFn, io) {
  const threats = await fetchFn();
  let inserted = 0;
  let failed = 0;
  let skipped = 0;

  for (const threat of threats) {
    const key = `${threat.indicator}:${threat.source}`;
    if (seen.has(key)) {
      skipped += 1;
      continue; // skip duplicates within this run
    }
    try {
      const saved = await addThreat(threat);
      // Broadcast the new threat to all connected Socket.io clients
      io.emit('threatUpdate', saved);
      inserted += 1;
    } catch (e) {
      console.error('Failed to store threat:', e.message);
      failed += 1;
    }
    seen.add(key);
  }

  return {
    fetched: threats.length,
    inserted,
    failed,
    skipped,
  };
}

async function runPollerCycle(io, reason = 'manual') {
  if (isRunning) {
    return { status: 'busy', message: 'Poller run already in progress.' };
  }

  isRunning = true;
  seen.clear();
  const startedAt = Date.now();

  console.log(`Running threat feed poller... (reason=${reason})`);
  try {
    ensureWriteConfigured();
    const otx = await ingestFeed(fetchOTX, io);
    const durationMs = Date.now() - startedAt;
    const hasFailures = otx.failed > 0 && otx.inserted === 0;
    const summary = {
      status: hasFailures ? 'degraded' : 'ok',
      reason,
      durationMs,
      feeds: { otx },
    };
    console.log('Poller cycle completed:', summary);
    return summary;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const summary = {
      status: 'error',
      reason,
      durationMs,
      error: error.message,
    };
    console.error('Poller cycle failed:', summary);
    return summary;
  } finally {
    isRunning = false;
  }
}

/** Initialize poller mode – no schedule, only manual triggers via API */
function startPoller() {
  console.log('Poller initialized in manual mode (Live Hunt trigger only).');
}

module.exports = { startPoller, runPollerCycle };
