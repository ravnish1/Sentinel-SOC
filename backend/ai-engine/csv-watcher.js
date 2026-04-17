const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const { parseCSV } = require('./csv-parser');
const { enrichWithAI } = require('./enrichment-pipeline');
const { writeEnrichedThreats } = require('./supabase-writer');

/**
 * Ensures required directories for the pipeline exist.
 */
async function ensureDirs(baseDir) {
  const dirs = ['incoming', 'processing', 'completed', 'failed', 'temp'];
  for (const d of dirs) {
    const fullPath = path.join(baseDir, d);
    await fs.mkdir(fullPath, { recursive: true });
  }
}

/**
 * Watches the data/incoming directory and triggers the AI pipeline for CSV files.
 */
function startCSVWatcher(io) {
  const baseDir = path.join(__dirname, '..', 'data');
  const incomingDir = path.join(baseDir, 'incoming');
  const processingDir = path.join(baseDir, 'processing');
  const completedDir = path.join(baseDir, 'completed');
  const failedDir = path.join(baseDir, 'failed');

  // Ensure dirs exist on start
  ensureDirs(baseDir).catch(err => console.error('[WATCHER] Dir creation failed:', err.message));

  console.log(`[WATCHER] Monitoring ${incomingDir} for new threat data...`);

  const watcher = chokidar.watch(incomingDir, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  watcher.on('add', async (filePath) => {
    if (path.extname(filePath).toLowerCase() !== '.csv') return;

    const fileName = path.basename(filePath);
    console.log(`[WATCHER] New threat data detected: ${fileName}`);

    const processingPath = path.join(processingDir, fileName);
    const completedPath = path.join(completedDir, `${Date.now()}_${fileName}`);
    const failedPath = path.join(failedDir, `${Date.now()}_${fileName}`);

    try {
      // Stage 1: Move to processing
      await fs.rename(filePath, processingPath);
      console.log(`[PIPELINE] Stage 1/5: File ${fileName} queued for processing`);

      // Stage 2: Parse CSV
      const rawThreats = await parseCSV(processingPath);
      console.log(`[PIPELINE] Stage 2/5: Parsed ${rawThreats.length} indicators from file`);

      if (rawThreats.length === 0) {
        console.warn('[PIPELINE] Skipping empty CSV file');
        await fs.rename(processingPath, completedPath);
        return;
      }

      // Stage 3: AI Enrichment
      console.log('[PIPELINE] Stage 3/5: Beginning AI deep-analysis...');
      const enrichedThreats = await enrichWithAI(rawThreats, fileName);
      console.log('[PIPELINE] Stage 3/5: AI enrichment complete');

      // Stage 4: Write to DB
      console.log('[PIPELINE] Stage 4/5: Syncing findings with Supabase console...');
      const summary = await writeEnrichedThreats(enrichedThreats);
      const logMsg = `[PIPELINE] Stage 4/5: Result — ${summary.inserted} inserted, ${summary.skipped} skipped, ${summary.errors} errors`;
      console.log(logMsg);

      // Stage 5: Archive
      await fs.rename(processingPath, completedPath);
      console.log(`[PIPELINE] Stage 5/5: Archived file to ${path.basename(completedPath)}`);
      console.log('[PIPELINE] ✅ HUNT COMPLETE — Analyst console refreshed');

      // Notify frontend
      if (io) {
        io.emit('threatUpdate', { type: 'ai_hunt_batch', count: summary.inserted });
        io.emit('aiHuntComplete', { fileName, summary });
      }

    } catch (err) {
      console.error(`[PIPELINE] ❌ FATAL ERROR processing ${fileName}:`, err.message);
      try {
        await fs.rename(processingPath, failedPath).catch(() => {});
      } catch (e) {}
    }
  });

  return watcher;
}

module.exports = { startCSVWatcher };
