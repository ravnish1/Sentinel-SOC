const { ollamaClient } = require('./ollama-client');
const { startCSVWatcher } = require('./csv-watcher');

/**
 * Pipeline Orchestrator: Single entry point for starting the AI Brain.
 */
async function initializeAIPipeline(io) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('[AI ENGINE] Initializing Sentinel-SOC AI Brain...');
  
  try {
    const isHealthy = await ollamaClient.checkHealth();
    
    if (isHealthy) {
      console.log(`[AI ENGINE] ✅ Ollama ONLINE — Model: ${ollamaClient.model}`);
    } else {
      console.log('[AI ENGINE] ⚠️ Ollama OFFLINE — System will use rule-based fallback');
    }

    startCSVWatcher(io);
    
    console.log('[AI ENGINE] 👁️ CSV Watcher active — monitoring data/incoming/');
    console.log('[AI ENGINE] Pipeline ready for threat ingestion.');
  } catch (err) {
    console.error('[AI ENGINE] ❌ Initialization failed:', err.message);
  }
  console.log('═══════════════════════════════════════════════\n');
}

module.exports = { initializeAIPipeline };
