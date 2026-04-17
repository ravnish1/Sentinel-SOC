const fs = require('fs');
const csv = require('csv-parser');

/**
 * Mapping table for common CSV headers to internal threat fields.
 */
const HEADER_MAP = {
  indicator: ['indicator', 'ioc', 'ioc_value', 'value', 'observable'],
  type: ['type', 'indicator_type', 'ioc_type', 'category'],
  source_ip: ['source_ip', 'src_ip', 'attacker_ip', 'origin_ip', 'src'],
  dest_ip: ['dest_ip', 'dst_ip', 'target_ip', 'victim_ip', 'dst'],
  severity: ['severity', 'risk', 'risk_level', 'threat_level', 'priority'],
  timestamp: ['timestamp', 'time', 'date', 'event_time', 'detected_at'],
  description: ['description', 'desc', 'message', 'details', 'summary'],
  source_feed: ['source', 'feed', 'source_feed', 'provider', 'intel_source', 'intel'],
  port: ['port', 'dst_port', 'dest_port', 'target_port'],
  protocol: ['protocol', 'proto'],
  country: ['country', 'geo', 'origin_country', 'src_country'],
  malware_family: ['malware', 'malware_family', 'family', 'threat_name'],
  cve: ['cve', 'cve_id', 'vulnerability', 'vuln_id']
};

/**
 * Auto-detect indicator type based on value patterns.
 */
function detectType(value) {
  if (!value) return 'unknown';
  const val = String(value).trim();
  
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(val)) return 'ip_address';
  if (/^[a-f0-9]{32}$/i.test(val)) return 'md5_hash';
  if (/^[a-f0-9]{64}$/i.test(val)) return 'sha256_hash';
  if (/^https?:\/\//i.test(val)) return 'url';
  if (/^CVE-\d{4}-\d+$/i.test(val)) return 'vulnerability';
  if (/\.[a-z]{2,}$/i.test(val)) return 'domain';
  
  return 'unknown';
}

/**
 * Normalize severity levels into a standard set.
 */
function normalizeSeverity(raw) {
  if (!raw) return 'medium';
  const val = String(raw).toLowerCase().trim();

  // Keyword mapping
  if (['critical', 'crit', '5', 'p1'].includes(val)) return 'critical';
  if (['high', '4', 'p2'].includes(val)) return 'high';
  if (['medium', 'med', '3', 'p3'].includes(val)) return 'medium';
  if (['low', '2', 'p4'].includes(val)) return 'low';
  if (['info', 'informational', '1', 'p5'].includes(val)) return 'informational';

  // Numeric scale (1-10)
  const num = parseInt(val);
  if (!isNaN(num)) {
    if (num >= 9) return 'critical';
    if (num >= 7) return 'high';
    if (num >= 4) return 'medium';
    return 'low';
  }

  return 'medium';
}

/**
 * Map a raw row object to the internal threat structure.
 */
function mapRowToThreat(row, index) {
  const result = {};
  const lowerRow = {};
  
  // Normalize row keys to lowercase for easier lookup
  Object.keys(row).forEach(key => {
    lowerRow[key.toLowerCase()] = row[key];
  });

  // Map fields using HEADER_MAP
  Object.keys(HEADER_MAP).forEach(field => {
    const variants = HEADER_MAP[field];
    const match = variants.find(v => lowerRow[v] !== undefined);
    result[field] = match !== undefined ? lowerRow[match] : null;
  });

  // Auto-detect type if missing
  if (!result.type) {
    result.type = detectType(result.indicator);
  }

  // Normalize severity
  result.severity = normalizeSeverity(result.severity);

  // Normalize timestamp
  let date = new Date(result.timestamp);
  if (isNaN(date.getTime())) {
    date = new Date();
  }
  
  return {
    indicator: result.indicator || 'unknown',
    type: result.type,
    source_ip: result.source_ip,
    dest_ip: result.dest_ip,
    severity: result.severity,
    timestamp: date.toISOString(),
    description: result.description || 'Imported via CSV',
    source_feed: result.source_feed || 'csv_import',
    extended: {
      port: result.port ? parseInt(result.port) : null,
      protocol: result.protocol,
      country: result.country,
      malware_family: result.malware_family,
      cve: result.cve,
      raw_row_number: index + 1
    },
    ai_enrichment: {}
  };
}

/**
 * Parse a CSV file and return normalized threats.
 */
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const threats = [];
    let rowIndex = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        try {
          threats.push(mapRowToThreat(data, rowIndex++));
        } catch (err) {
          console.warn(`[CSV] Skipping row ${rowIndex}: ${err.message}`);
        }
      })
      .on('end', () => {
        resolve(threats);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

module.exports = { parseCSV };
