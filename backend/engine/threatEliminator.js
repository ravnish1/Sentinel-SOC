// backend/engine/threatEliminator.js
// Threat elimination engine for automated threat response

const { getWriteClient, getReadClient } = require('../db');

class ThreatEliminator {
  constructor(io) {
    this.io = io; // Socket.IO instance for real-time events
    this.actionMap = {
      'block_ip': this.blockIP.bind(this),
      'quarantine_domain': this.quarantineDomain.bind(this),
      'flag_hash': this.flagHash.bind(this),
      'alert_only': this.alertOnly.bind(this)
    };
  }

  /**
   * Determine and execute elimination action based on threat score
   * @param {Object} threat - The threat object
   * @param {Object} scoreResult - Result from threatScorer
   * @returns {Promise<Object>} Action result
   */
  async eliminateThreat(threat, scoreResult, actionTypeOverride = null, options = {}) {
    const { score, severity } = scoreResult;
    const { emitEvent = true } = options;
    let actionType = actionTypeOverride;

    // Determine action based on score if no override is provided
    if (!actionType) {
      if (score >= 80) {
        actionType = threat.type === 'ip' ? 'block_ip' :
                     threat.type === 'domain' ? 'quarantine_domain' :
                     threat.type === 'hash' ? 'flag_hash' : 'alert_only';
      } else if (score >= 60) {
        actionType = threat.type === 'ip' ? 'block_ip' :
                     threat.type === 'domain' ? 'quarantine_domain' :
                     threat.type === 'hash' ? 'flag_hash' : 'alert_only';
      } else if (score >= 40) {
        actionType = threat.type === 'hash' ? 'flag_hash' : 'alert_only';
      } else {
        actionType = 'alert_only';
      }
    }

    if (!this.actionMap[actionType]) {
      actionType = 'alert_only';
    }

    // Execute the action
    const actionFn = this.actionMap[actionType] || this.alertOnly;
    const result = await actionFn(threat, scoreResult);

    // Log action to database
    await this.logAction(threat.id, actionType, scoreResult, result);

    // Emit Socket.IO event
    if (this.io && emitEvent) {
      this.io.emit('threatEliminated', {
        threatId: threat.id,
        indicator: threat.indicator,
        type: threat.type,
        action: actionType,
        severity,
        score,
        timestamp: new Date().toISOString(),
        reason: result.reason
      });
    }

    return {
      action: actionType,
      severity,
      score,
      result: result
    };
  }

  /**
   * Block an IP address
   * @param {Object} threat
   * @param {Object} scoreResult
   * @returns {Promise<Object>}
   */
  async blockIP(threat, scoreResult) {
    // In a real system, this would interface with firewall/API
    // For now, we'll add to blocked_indicators table
    const client = getWriteClient();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data, error } = await client
      .from('blocked_indicators')
      .insert({
        indicator: threat.indicator,
        type: threat.type,
        blocked_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        reason: `Auto-blocked due to critical threat score: ${scoreResult.score}`,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      action: 'block_ip',
      blockedIndicatorId: data.id,
      expiresAt: data.expires_at,
      reason: `IP ${threat.indicator} blocked due to critical threat score`
    };
  }

  /**
   * Quarantine a domain (mark for monitoring/restriction)
   * @param {Object} threat
   * @param {Object} scoreResult
   * @returns {Promise<Object>}
   */
  async quarantineDomain(threat, scoreResult) {
    const client = getWriteClient();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

    const { data, error } = await client
      .from('blocked_indicators')
      .insert({
        indicator: threat.indicator,
        type: threat.type,
        blocked_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        reason: `Domain quarantined due to high threat score: ${scoreResult.score}`,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      action: 'quarantine_domain',
      blockedIndicatorId: data.id,
      expiresAt: data.expires_at,
      reason: `Domain ${threat.indicator} quarantined due to high threat score`
    };
  }

  /**
   * Flag a hash for review
   * @param {Object} threat
   * @param {Object} scoreResult
   * @returns {Promise<Object>}
   */
  async flagHash(threat, scoreResult) {
    const client = getWriteClient();
    const { data, error } = await client
      .from('blocked_indicators')
      .insert({
        indicator: threat.indicator,
        type: threat.type,
        blocked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
        reason: `Hash flagged for review due to medium threat score: ${scoreResult.score}`,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      action: 'flag_hash',
      blockedIndicatorId: data.id,
      expiresAt: data.expires_at,
      reason: `Hash ${threat.indicator} flagged due to medium threat score`
    };
  }

  /**
   * Alert only (no action, just notification)
   * @param {Object} threat
   * @param {Object} scoreResult
   * @returns {Promise<Object>}
   */
  async alertOnly(threat, scoreResult) {
    return {
      success: true,
      action: 'alert_only',
      reason: `Low threat score (${scoreResult.score}) - alert only`
    };
  }

  /**
   * Log elimination action to threat_actions table
   * @param {string} threatId
   * @param {string} actionType
   * @param {Object} scoreResult
   * @param {Object} actionResult
   * @returns {Promise<void>}
   */
  async logAction(threatId, actionType, scoreResult, actionResult) {
    try {
      const client = getWriteClient();
      const { error } = await client
        .from('threat_actions')
        .insert({
          threat_id: threatId,
          action_type: actionType,
          severity_score: scoreResult.score,
          status: actionResult.success ? 'executed' : 'failed',
          executed_at: new Date().toISOString(),
          reason: actionResult.reason || `Action ${actionType} executed`
        });

      if (error) {
        console.error('Failed to log threat action:', error);
      }
    } catch (error) {
      console.error('Error logging threat action:', error);
    }
  }

  /**
   * Revert a previously executed action
   * @param {string} actionId
   * @returns {Promise<Object>}
   */
  async revertAction(actionId) {
    try {
      const client = getWriteClient();

      // Get the action first
      const { data: actionData, error: actionError } = await client
        .from('threat_actions')
        .select('*')
        .eq('id', actionId)
        .single();

      if (actionError) throw actionError;
      if (!actionData) throw new Error('Action not found');
      if (actionData.status === 'reverted') throw new Error('Action already reverted');

      // Get the associated blocked indicator
      const { data: blockedData, error: blockedError } = await client
        .from('blocked_indicators')
        .select('*')
        .eq('indicator', actionData.indicator) // We'd need to store this link better
        .eq('is_active', true)
        .maybeSingle();

      // For now, we'll just mark the action as reverted
      const { error: updateError } = await client
        .from('threat_actions')
        .update({
          status: 'reverted',
          reverted_at: new Date().toISOString()
        })
        .eq('id', actionId);

      if (updateError) throw updateError;

      // Emit Socket.IO event for revert
      if (this.io) {
        this.io.emit('threatActionReverted', {
          actionId,
          threatId: actionData.threat_id,
          actionType: actionData.action_type,
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        actionId,
        revertedAt: new Date().toISOString(),
        reason: `Action ${actionData.action_type} reverted`
      };
    } catch (error) {
      console.error('Error reverting action:', error);
      throw error;
    }
  }
}

module.exports = { ThreatEliminator };
