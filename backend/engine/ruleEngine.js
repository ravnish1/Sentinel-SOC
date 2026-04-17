// backend/engine/ruleEngine.js
// Simple rule engine for threat elimination

const { getReadClient, getWriteClient } = require('../db');

class RuleEngine {
  constructor() {
    this.rules = []; // Will be loaded from database
    this.defaultRules = [
      {
        id: 'default-1',
        name: 'Auto-block critical IPs',
        conditions: { type: 'ip', min_score: 80 },
        action_type: 'block_ip',
        is_active: true,
        priority: 1
      },
      {
        id: 'default-2',
        name: 'Quarantine suspicious domains',
        conditions: { type: 'domain', min_score: 60 },
        action_type: 'quarantine_domain',
        is_active: true,
        priority: 2
      },
      {
        id: 'default-3',
        name: 'Flag malicious hashes',
        conditions: { type: 'hash', min_score: 50 },
        action_type: 'flag_hash',
        is_active: true,
        priority: 3
      },
      {
        id: 'default-4',
        name: 'Alert on all new URLs',
        conditions: { type: 'url', min_score: 0 },
        action_type: 'alert_only',
        is_active: true,
        priority: 4
      },
      {
        id: 'default-5',
        name: 'Block repeated offenders',
        conditions: { min_score: 90 },
        action_type: 'block_ip',
        is_active: true,
        priority: 0
      }
    ];
  }

  /**
   * Load rules from database
   * @returns {Promise<void>}
   */
  async loadRules() {
    try {
      const client = getReadClient();
      const { data, error } = await client
        .from('elimination_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) {
        console.warn('Failed to load rules from database, using defaults:', error.message);
        this.rules = [...this.defaultRules];
      } else {
        this.rules = data.length > 0 ? data : [...this.defaultRules];
      }
    } catch (error) {
      console.warn('Error loading rules, using defaults:', error.message);
      this.rules = [...this.defaultRules];
    }
  }

  /**
   * Evaluate a threat against all rules and return matching actions
   * @param {Object} threat - The threat object
   * @param {Object} scoreResult - Score result from threatScorer
   * @returns {Array} Array of matching rule actions
   */
  async evaluateThreat(threat, scoreResult) {
    // Ensure rules are loaded
    if (this.rules.length === 0) {
      await this.loadRules();
    }

    const matchingActions = [];

    for (const rule of this.rules) {
      if (!rule.is_active) continue;

      if (this.evaluateConditions(threat, scoreResult, rule.conditions)) {
        matchingActions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actionType: rule.action_type,
          priority: rule.priority
        });
      }
    }

    // Sort by priority (lower number = higher priority)
    matchingActions.sort((a, b) => a.priority - b.priority);
    return matchingActions;
  }

  /**
   * Evaluate if threat matches rule conditions
   * @param {Object} threat
   * @param {Object} scoreResult
   * @param {Object} conditions
   * @returns {boolean}
   */
  evaluateConditions(threat, scoreResult, conditions) {
    for (const [key, value] of Object.entries(conditions)) {
      let threatValue;

      // Handle special score conditions
      if (key === 'score_gte') {
        if (scoreResult.score < value) return false;
        continue;
      }
      if (key === 'score_lte') {
        if (scoreResult.score > value) return false;
        continue;
      }
      if (key === 'score_gt') {
        if (scoreResult.score <= value) return false;
        continue;
      }
      if (key === 'score_lt') {
        if (scoreResult.score >= value) return false;
        continue;
      }
      if (key === 'min_score') {
        if (scoreResult.score < value) return false;
        continue;
      }
      if (key === 'max_score') {
        if (scoreResult.score > value) return false;
        continue;
      }

      // Map condition keys to threat/score properties
      switch (key) {
        case 'type':
          threatValue = threat.type;
          break;
        case 'source':
          threatValue = threat.source;
          break;
        case 'indicator':
          threatValue = threat.indicator;
          break;
        case 'severity':
          threatValue = scoreResult.severity;
          break;
        default:
          threatValue = threat[key];
          break;
      }

      // Handle case-insensitive string comparison
      if (typeof threatValue === 'string' && typeof value === 'string') {
        if (threatValue.toLowerCase() !== value.toLowerCase()) return false;
      } else if (threatValue !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add a new rule
   * @param {Object} ruleData
   * @returns {Promise<Object>}
   */
  async addRule(ruleData) {
    try {
      const client = getWriteClient();
      const { data, error } = await client
        .from('elimination_rules')
        .insert({
          name: ruleData.name,
          conditions: ruleData.conditions,
          action_type: ruleData.action_type,
          is_active: ruleData.is_active !== undefined ? ruleData.is_active : true,
          priority: ruleData.priority || 999
        })
        .select()
        .single();

      if (error) throw error;

      // Reload rules
      await this.loadRules();
      return data;
    } catch (error) {
      console.error('Error adding rule:', error);
      throw error;
    }
  }

  /**
   * Update an existing rule
   * @param {string} ruleId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateRule(ruleId, updates) {
    try {
      const client = getWriteClient();
      const { data, error } = await client
        .from('elimination_rules')
        .update(updates)
        .eq('id', ruleId)
        .select()
        .single();

      if (error) throw error;

      // Reload rules
      await this.loadRules();
      return data;
    } catch (error) {
      console.error('Error updating rule:', error);
      throw error;
    }
  }

  /**
   * Delete a rule
   * @param {string} ruleId
   * @returns {Promise<void>}
   */
  async deleteRule(ruleId) {
    try {
      const client = getWriteClient();
      const { error } = await client
        .from('elimination_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      // Reload rules
      await this.loadRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      throw error;
    }
  }

  /**
   * Get all rules
   * @returns {Promise<Array>}
   */
  async getRules() {
    if (this.rules.length === 0) {
      await this.loadRules();
    }
    return [...this.rules];
  }
}

module.exports = { RuleEngine };
