const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { parseCSV } = require('../ai-engine/csv-parser');
const { enrichWithAI, pipelineStatus } = require('../ai-engine/enrichment-pipeline');
const { writeEnrichedThreats } = require('../ai-engine/supabase-writer');
const { ollamaClient } = require('../ai-engine/ollama-client');
const { getById, updateById, getReadClient } = require('../db');

const router = express.Router();

// Configure Multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'data', 'temp'));
  },
  filename: (req, file, cb) => {
    cb(null, `upload_${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/**
 * POST /api/ai/upload-csv
 * Upload a CSV file and optionally process immediately.
 */
router.post('/upload-csv', upload.single('threatFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const immediate = req.query.immediate === 'true';
    const filePath = req.file.path;
    const fileName = req.file.filename;

    if (!immediate) {
      const incomingPath = path.join(__dirname, '..', 'data', 'incoming', fileName);
      await fs.mkdir(path.dirname(incomingPath), { recursive: true });
      await fs.rename(filePath, incomingPath);
      return res.json({
        status: 'queued',
        file: fileName,
        message: 'File added to incoming queue for background processing.'
      });
    }

    // Immediate processing
    console.log(`[AI ROUTES] Starting immediate process for ${fileName}`);
    const rawThreats = await parseCSV(filePath);
    const enrichedThreats = await enrichWithAI(rawThreats, fileName);
    const result = await writeEnrichedThreats(enrichedThreats);

    // Archive
    const completedPath = path.join(__dirname, '..', 'data', 'completed', fileName);
    await fs.mkdir(path.dirname(completedPath), { recursive: true });
    await fs.rename(filePath, completedPath);

    const criticalCount = enrichedThreats.filter(t => t.severity === 'critical').length;

    res.json({
      status: 'completed',
      pipeline: {
        file: fileName,
        total: rawThreats.length,
        enriched: enrichedThreats.length,
        ...result
      },
      summary: {
        critical_threats: criticalCount,
        immediate_actions: enrichedThreats.filter(t => t.ai_enrichment?.recommended_action === 'block_immediately').length,
        avg_confidence: (enrichedThreats.reduce((acc, t) => acc + (t.ai_enrichment?.confidence_score || 0), 0) / Math.max(1, enrichedThreats.length)).toFixed(1)
      }
    });

  } catch (error) {
    console.error('[AI ROUTES] Upload-CSV Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/pipeline-status
 * Get status of Ollama and file queues.
 */
router.get('/pipeline-status', async (req, res) => {
  try {
    const isOnline = await ollamaClient.checkHealth();
    const baseDir = path.join(__dirname, '..', 'data');
    
    const counts = {
      incoming: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    for (const dir of Object.keys(counts)) {
      try {
        const files = await fs.readdir(path.join(baseDir, dir));
        counts[dir] = files.filter(f => f.endsWith('.csv')).length;
      } catch (err) {
        // Dir might not exist yet
      }
    }

    res.json({
      ai_engine: {
        ollama_status: isOnline ? 'ONLINE' : 'OFFLINE',
        model: ollamaClient.model,
        fallback_mode: !isOnline
      },
      pipeline: {
        queued: counts.incoming,
        processing: counts.processing,
        completed: counts.completed,
        failed: counts.failed,
        active_job: pipelineStatus.is_active ? pipelineStatus : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/re-analyze/:threatId
 * Manually re-trigger AI analysis on a specific recorded threat.
 */
router.post('/re-analyze/:threatId', async (req, res) => {
  try {
    const threat = await getById(req.params.threatId);
    if (!threat) return res.status(404).json({ error: 'Threat not found' });

    const threatObj = {
      indicator: threat.indicator,
      type: threat.type || threat.threat_type,
      source_ip: threat.source_ip,
      dest_ip: threat.dest_ip,
      severity: threat.severity,
      description: threat.raw_json?.description || 'Re-analysis request',
      source_feed: threat.source_feed,
      extended: { ...threat.raw_json },
      ai_enrichment: {}
    };

    const [enriched] = await enrichWithAI([threatObj]);
    const ai = enriched.ai_enrichment;

    const newRawJson = {
      ...threat.raw_json,
      ai_insights: {
        confidence_score: ai.confidence_score,
        intent: ai.intent_classification,
        action: ai.recommended_action,
        summary: ai.analyst_summary,
        model_used: ai.ai_model,
        analyzed_at: ai.analyzed_at
      }
    };

    await updateById(threat.id, { raw_json: newRawJson });

    res.json({
      status: 'reanalyzed',
      insights: newRawJson.ai_insights
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/stats
 * Aggregated AI metrics from Supabase.
 */
router.get('/stats', async (req, res) => {
  try {
    const client = getReadClient();
    const { data: threats, error } = await client
      .from('threats')
      .select('raw_json')
      .not('raw_json->ai_insights', 'is', null);

    if (error) throw error;

    const stats = {
      totalAnalyzed: threats.length,
      avgConfidence: 0,
      intentBreakdown: {},
      urgencyBreakdown: {},
      clusterCount: 0,
      immediateActions: 0
    };

    const clusters = new Set();
    let totalConf = 0;

    threats.forEach(t => {
      const ai = t.raw_json.ai_insights;
      totalConf += (ai.confidence_score || 0);
      
      const intent = ai.intent || 'unknown';
      stats.intentBreakdown[intent] = (stats.intentBreakdown[intent] || 0) + 1;

      const urgency = ai.urgency || 'normal';
      stats.urgencyBreakdown[urgency] = (stats.urgencyBreakdown[urgency] || 0) + 1;

      if (ai.cluster_id) clusters.add(ai.cluster_id);
      if (ai.action === 'block_immediately') stats.immediateActions++;
    });

    stats.avgConfidence = threats.length ? (totalConf / threats.length).toFixed(1) : 0;
    stats.clusterCount = clusters.size;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/fetch-remote
 * Download a CSV from a URL and save it to the incoming queue.
 */
router.post('/fetch-remote', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const axios = require('axios');
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      timeout: 10000
    });

    const fileName = `remote_${Date.now()}_${path.basename(new URL(url).pathname) || 'data.csv'}`;
    const targetPath = path.join(__dirname, '..', 'data', 'incoming', fileName);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    
    const writer = require('fs').createWriteStream(targetPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        res.json({
          status: 'fetching',
          file: fileName,
          message: 'Remote CSV downloaded. Ingestion and AI analysis will start in the background.'
        });
        resolve();
      });
      writer.on('error', (err) => {
        console.error('[AI ROUTES] Download stream error:', err.message);
        res.status(500).json({ error: 'Failed to save downloaded file' });
        reject(err);
      });
    });

  } catch (error) {
    console.error('[AI ROUTES] Remote-fetch Error:', error.message);
    res.status(500).json({ error: `Connection failed: ${error.message}` });
  }
});

module.exports = router;
