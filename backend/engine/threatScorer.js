// backend/engine/threatScorer.js
// Threat scoring engine for calculating threat severity

const { getReadClient } = require('../db');

// Threat type weights (0-100 scale)
const TYPE_WEIGHTS = {
  ip: 30,
  domain: 25,
  hash: 40,
  url: 20,
  // Default for unknown types
  default: 15
};

// Source reputation weights
const SOURCE_WEIGHTS = {
  otx: 25,      // AlienVault OTX - high reputation
  manual: 15,   // Manual entry - medium reputation
  // Default for unknown sources
  default: 10
};

class ThreatScorer {
  constructor() {
    this.indicatorFrequency = new Map(); // In-memory frequency counter
  }

  /**
   * Calculate threat score based on multiple factors
   * @param {Object} threat - Threat object with indicator, type, source, raw_json, timestamp
   * @returns {Object} Score result with score, severity, and factors
   */
  async scoreThreat(threat) {
    const factors = [];
    let score = 0;

    // 1. Threat type weight
    const typeWeight = TYPE_WEIGHTS[threat.type] || TYPE_WEIGHTS.default;
    score += typeWeight;
    factors.push({ factor: 'type', weight: typeWeight, description: `Threat type: ${threat.type}` });

    // 2. Source reputation weight
    const sourceKey = threat.source ? threat.source.toLowerCase() : 'unknown';
    const sourceWeight = SOURCE_WEIGHTS[sourceKey] || SOURCE_WEIGHTS.default;
    score += sourceWeight;
    factors.push({ factor: 'source', weight: sourceWeight, description: `Source: ${threat.source || 'unknown'}` });

    // 3. Frequency bonus (repeated indicators get higher score)
    const frequency = await this.getIndicatorFrequency(threat.indicator);
    const frequencyScore = Math.min(frequency * 5, 20); // Max 20 points for frequency
    score += frequencyScore;
    if (frequency > 0) {
      factors.push({ factor: 'frequency', weight: frequencyScore, description: `Appeared ${frequency + 1} times` });
    }

    // 4. Recency bonus (newer threats score higher)
    const recencyScore = this.calculateRecencyScore(threat.timestamp);
    score += recencyScore;
    if (recencyScore > 0) {
      factors.push({ factor: 'recency', weight: recencyScore, description: 'Recent threat' });
    }

    // Ensure score is within 0-100 range
    score = Math.min(Math.max(score, 0), 100);

    // Determine severity level
    let severity;
    if (score >= 80) {
      severity = 'critical';
    } else if (score >= 60) {
      severity = 'high';
    } else if (score >= 40) {
      severity = 'medium';
    } else if (score >= 20) {
      severity = 'low';
    } else {
      severity = 'info';
    }

    // Update frequency counter
    this.updateIndicatorFrequency(threat.indicator);

    const formattedFactors = factors.map((f) => {
      return {
        name: f.factor,
        weight: f.weight,
        description: f.description
      };
    });

    return {
      score: Math.round(score),
      severity,
      factors: formattedFactors
    };
  }

  /**
   * Get how many times an indicator has been seen recently
   * @param {string} indicator - The threat indicator
   * @returns {Promise<number>} Frequency count
   */
  async getIndicatorFrequency(indicator) {
    try {
      // Check in-memory cache first
      if (this.indicatorFrequency.has(indicator)) {
        return this.indicatorFrequency.get(indicator);
      }

      // Fallback to database for persistence
      const client = getReadClient();
      const { count } = await client
        .from('threats')
        .select('indicator', { count: 'exact' })
        .eq('indicator', indicator)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      const frequency = count || 0;
      this.indicatorFrequency.set(indicator, frequency);
      return frequency;
    } catch (error) {
      console.warn('Error getting indicator frequency:', error.message);
      return 0;
    }
  }

  /**
   * Update frequency counter for an indicator (called after processing)
   * @param {string} indicator
   */
  updateIndicatorFrequency(indicator) {
    const current = this.indicatorFrequency.get(indicator) || 0;
    this.indicatorFrequency.set(indicator, current + 1);
  }

  /**
   * Calculate recency score (0-15 points)
   * @param {string} timestampStr - ISO timestamp string
   * @returns {number} Recency score
   */
  calculateRecencyScore(timestampStr) {
    if (!timestampStr) return 0;
    const threatTime = new Date(timestampStr).getTime();
    const now = Date.now();
    const hoursOld = (now - threatTime) / (1000 * 60 * 60);

    // Newer threats get higher score: 0-24 hours -> 15 points linearly decreasing
    if (hoursOld <= 1) return 15;
    if (hoursOld <= 6) return 12;
    if (hoursOld <= 12) return 8;
    if (hoursOld <= 24) return 4;
    return 0;
  }
}

module.exports = { ThreatScorer };
