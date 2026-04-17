const { ensureWriteConfigured } = require('../db');

/**
 * Writes AI-enriched threats to Supabase, filtering by elimination rules.
 */
async function writeEnrichedThreats(enrichedThreats) {
  const client = ensureWriteConfigured();
  const summary = { inserted: 0, skipped: 0, errors: 0 };

  try {
    // Step 1: Fetch active blocked_indicators to avoid duplicates
    const { data: blocked, error: blockedError } = await client
      .from('blocked_indicators')
      .select('indicator')
      .eq('is_active', true);

    const eliminationSet = new Set();
    if (!blockedError && blocked) {
      blocked.forEach(b => {
        if (b.indicator) eliminationSet.add(b.indicator.toLowerCase());
      });
    }

    // Step 2 & 3: Filter and Build Payload
    const payload = enrichedThreats
      .filter(threat => {
        if (eliminationSet.has(threat.indicator.toLowerCase())) {
          summary.skipped++;
          return false;
        }
        return true;
      })
      .map(threat => {
        const ai = threat.ai_enrichment || {};
        
        // Map fields to DB schema. Note: standardizing names.
        return {
          indicator: threat.indicator,
          type: threat.type || 'unknown',
          threat_type: threat.type || 'unknown',
          source: threat.source_feed || 'csv_import',
          source_ip: threat.source_ip,
          dest_ip: threat.dest_ip,
          severity: threat.severity,
          detected_at: threat.timestamp,
          source_feed: threat.source_feed,
          status: ai.confidence_score >= 80 ? 'confirmed' : 'pending_review',
          ai_processed: true,
          raw_json: {
            ...threat.extended,
            ai_insights: {
              confidence_score: ai.confidence_score || 0,
              intent: ai.intent || ai.intent_classification || 'unknown',
              attack_stage: ai.attack_stage || 'unknown',
              kill_chain_phase: ai.kill_chain || ai.kill_chain_phase || 'unknown',
              threat_actor_type: ai.threat_actor_profile || 'unknown',
              action: ai.recommended_action || 'monitor',
              urgency: ai.urgency || 'normal',
              summary: ai.analyst_summary || '',
              related_cves: ai.related_cves || [],
              false_positive_risk: ai.false_positive_likelihood || 'medium',
              tags: ai.threat_intel_tags || [],
              cluster_id: ai.threat_cluster_id || null,
              cluster_name: ai.cluster_name || null,
              campaign: ai.campaign_assessment || null,
              model_used: ai.ai_model || 'rule_based',
              analyzed_at: ai.analyzed_at || new Date().toISOString()
            }
          }
        };
      });

    // Step 4: Batch insert in chunks of 50
    const CHUNK_SIZE = 50;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error: insertError } = await client
        .from('threats')
        .insert(chunk);

      if (insertError) {
        console.error(`[DB WRITER] Batch insert error: ${insertError.message}`);
        summary.errors += chunk.length;
      } else {
        summary.inserted += chunk.length;
      }
    }

    // Step 5: Log complete action (Audit Trail)
    try {
      await client.from('threat_actions').insert([{
        action_type: 'ai_hunt_complete',
        status: 'executed',
        severity_score: 0,
        executed_at: new Date().toISOString(),
        // details column stores the breakdown
        details: {
          total_processed: enrichedThreats.length,
          ...summary
        }
      }]);
    } catch (auditErr) {
      // Ignore if table doesn't exist
    }

  } catch (err) {
    console.error(`[DB WRITER] Fatal error in writer: ${err.message}`);
    throw err;
  }

  return summary;
}

module.exports = { writeEnrichedThreats };
