// poller.js – on-demand ingestion of threat feeds and real-time broadcast
const { addThreat, ensureWriteConfigured } = require('./db');
const { fetchLatest: fetchOTX } = require('./feeds/otx');
const { ThreatScorer } = require('./engine/threatScorer');
const { RuleEngine } = require('./engine/ruleEngine');
const { ThreatEliminator } = require('./engine/threatEliminator');
// You can import additional feeds here, e.g. const { fetchLatest: fetchAbuseIPDB } = require('./feeds/abuseipdb');

/** Simple in‑memory set to dedupe indicators during a single poll run */
const seen = new Set();
let isRunning = false;
const threatScorer = new ThreatScorer();
const ruleEngine = new RuleEngine();

async function ingestFeed(fetchFn, io, eliminator) {
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

      try {
        const scoreResult = await threatScorer.scoreThreat(saved);
        const ruleMatches = await ruleEngine.evaluateThreat(saved, scoreResult);
        const ruleAction = ruleMatches.length > 0 ? ruleMatches[0].actionType : null;
        const eliminationResult = await eliminator.eliminateThreat(saved, scoreResult, ruleAction, { emitEvent: false });

        if (eliminationResult?.result?.success) {
          io.emit('threatEliminated', {
            threat: { id: saved.id, indicator: saved.indicator, type: saved.type },
            score: scoreResult.score,
            severity: scoreResult.severity,
            action: eliminationResult.action,
            timestamp: new Date().toISOString()
          });
        }

        console.log(`[ELIMINATOR] ${eliminationResult.action} on ${saved.indicator} (score: ${scoreResult.score})`);
      } catch (error) {
        console.error('Elimination pipeline failed:', error.message);
      }

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
    await ruleEngine.loadRules();
    const eliminator = new ThreatEliminator(io);
    const otx = await ingestFeed(fetchOTX, io, eliminator);
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
