const { ollamaClient } = require('./ollama-client');

/**
 * Global status shared with the API routes.
 */
const pipelineStatus = {
  is_active: false,
  current_file: null,
  total_threats: 0,
  processed_threats: 0,
  current_batch: 0,
  total_batches: 0,
  last_enrichment_time: null
};


/**
 * Fallback rule-based enrichment for when AI is unavailable.
 */
function enrichWithRules(threat) {
  let score = 50;

  // Severity weights
  const weights = { critical: 30, high: 20, medium: 10, low: 0, informational: -10 };
  score += weights[threat.severity] || 0;

  // Type weights
  const typeWeights = {
    vulnerability: 15,
    sha256_hash: 10,
    md5_hash: 10,
    url: 8,
    ip_address: 5,
    domain: 5
  };
  score += typeWeights[threat.type] || 0;

  // Metadata signals
  const hotPorts = [4444, 5555, 1337, 31337, 8443, 9001];
  if (threat.extended.port && hotPorts.includes(threat.extended.port)) score += 15;
  if (threat.extended.cve) score += 10;
  if (threat.extended.malware_family && threat.extended.malware_family !== 'Unknown') score += 20;

  score = Math.min(100, Math.max(0, score));

  let action = 'monitor';
  if (score >= 80) action = 'block_immediately';
  else if (score >= 60) action = 'investigate';

  return {
    confidence_score: score,
    intent_classification: 'unknown',
    attack_stage: 'unknown',
    kill_chain_phase: 'unknown',
    recommended_action: action,
    urgency: score >= 80 ? 'immediate' : 'within_24_hours',
    analyst_summary: `Rule-based assessment: Target exhibits patterns with confidence score ${score}.`,
    analysis_method: 'rule_based_fallback',
    analyzed_at: new Date().toISOString()
  };
}

/**
 * THE CORE AI LOGIC: Analyzes threats using Ollama with rule-based fallback.
 */
async function enrichWithAI(threats, fileName = 'manual_ingestion') {
  if (!Array.isArray(threats) || threats.length === 0) return [];

  // Reset status
  pipelineStatus.is_active = true;
  pipelineStatus.current_file = fileName;
  pipelineStatus.total_threats = threats.length;
  pipelineStatus.processed_threats = 0;

  const isHealthy = await ollamaClient.checkHealth();
  const BATCH_SIZE = parseInt(process.env.AI_BATCH_SIZE) || 5;
  pipelineStatus.total_batches = Math.ceil(threats.length / BATCH_SIZE);


  if (!isHealthy) {
    console.warn('[AI ENGINE] Ollama is OFFLINE. Using rule-based fallback for all threats.');
    return threats.map(t => ({
      ...t,
      ai_enrichment: enrichWithRules(t)
    }));
  }

  const results = [];

  // PHASE A: Analysis Phase
  for (let i = 0; i < threats.length; i += BATCH_SIZE) {
    const batch = threats.slice(i, i + BATCH_SIZE);
    pipelineStatus.current_batch = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`[AI ENGINE] Analyzing threat batch ${pipelineStatus.current_batch}/${pipelineStatus.total_batches}...`);

    // Concurrent processing within the batch
    const batchPromises = batch.map(async (threat) => {
      // OPTIMIZATION: Skip AI for low/informational severity to save time
      if (threat.severity === 'low' || threat.severity === 'informational') {
        threat.ai_enrichment = enrichWithRules(threat);
        threat.ai_enrichment.analysis_method = 'automatic_rule_optimization';
        return threat;
      }

      // OPTIMIZATION: Check if this indicator was recently processed to skip redundant AI calls
      if (threat.raw_json?.ai_insights && !threat.force_reanalyze) {
        threat.ai_enrichment = {
          ...threat.raw_json.ai_insights,
          analysis_method: 'cached_look_up'
        };
        return threat;
      }

      const prompt = `
Analyze threat:
Type: ${threat.type}
Indicator: ${threat.indicator}
Context: ${threat.description || 'none'}

Return JSON only:
{
  "confidence_score": <int 0-100>,
  "intent": "<recon|access|execution|persistence|c2|exfil|benign>",
  "kill_chain": "<weaponization|delivery|exploitation|c2|objectives>",
  "recommended_action": "<block|investigate|monitor>",
  "urgency": "<immediate|24h|review>",
  "analyst_summary": "<max 15 words>"
}
`;
      const aiResponse = await ollamaClient.analyze(prompt, {
        temperature: 0,
        // Rapid response for batch processing
        retries: 0
      });

      if (aiResponse.success) {
        threat.ai_enrichment = {
          ...aiResponse.data,
          ai_model: aiResponse.model,
          processing_time: aiResponse.processingTime,
          analyzed_at: new Date().toISOString()
        };
      } else {
        console.warn(`[AI ENGINE] Failed to analyze indicator ${threat.indicator}. Falling back to rules.`);
        threat.ai_enrichment = enrichWithRules(threat);
      }
      return threat;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    pipelineStatus.processed_threats += batchResults.length;

    // Small breathe time between batches to prevent thermal throttling/UI lag
    if (i + BATCH_SIZE < threats.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  pipelineStatus.is_active = false;
  pipelineStatus.last_enrichment_time = new Date().toISOString();


  // PHASE B: Cluster Detection (Optional)
  if (results.length >= 3) {
    try {
      console.log('[AI ENGINE] Attempting cluster detection on indicators...');
      const clusterPrompt = `
You are a threat intelligence analyst. Review these ${results.length} indicators 
and identify which belong to the same attack campaign.

INDICATORS:
${results.map((r, i) => `${i + 1}. [${r.type}] ${r.indicator} (from: ${r.source_ip || 'unknown'}) — ${r.description}`).join('\n')}

Respond with ONLY valid JSON:
{
  "clusters": [
    {
      "cluster_id": "<unique_id>",
      "cluster_name": "<descriptive name>",
      "member_indices": [<1-indexed numbers for the indicators list>],
      "campaign_assessment": "<brief description of the campaign>",
      "confidence": <0-100>
    }
  ],
  "unclustered_indices": [<numbers for indicators not in a cluster>],
  "overall_assessment": "<one paragraph high-level summary>"
}
`;
      const clusterResponse = await ollamaClient.analyze(clusterPrompt);
      if (clusterResponse.success && clusterResponse.data.clusters) {
        clusterResponse.data.clusters.forEach(cluster => {
          cluster.member_indices.forEach(idx => {
            const threat = results[idx - 1];
            if (threat) {
              threat.ai_enrichment.threat_cluster_id = cluster.cluster_id;
              threat.ai_enrichment.cluster_name = cluster.cluster_name;
              threat.ai_enrichment.campaign_assessment = cluster.campaign_assessment;
            }
          });
        });
        console.log(`[AI ENGINE] Detected ${clusterResponse.data.clusters.length} threat clusters.`);
      }
    } catch (err) {
      console.warn('[AI ENGINE] Cluster detection failed:', err.message);
    }
  }

  return results;
}

module.exports = { enrichWithAI, pipelineStatus };
