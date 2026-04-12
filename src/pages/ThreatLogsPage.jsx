import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download, Filter, Radar, Search, ShieldAlert, ShieldCheck, ShieldX, Target } from 'lucide-react';
import './ThreatLogsPage.css';

const logRows = [
  {
    id: 'INC-2041',
    time: '12:41:08 UTC',
    source: '185.33.12.11',
    target: 'vpn-gateway-01',
    event: 'Credential stuffing burst',
    technique: 'MITRE T1110',
    severity: 'Critical',
    verdict: 'Blocked',
    region: 'Amsterdam, NL',
    owner: 'SOC-2',
    note: '1,248 login attempts against SSO in 90 seconds.',
  },
  {
    id: 'INC-2042',
    time: '12:39:44 UTC',
    source: '45.33.22.11',
    target: 'api-prod-03',
    event: 'SQL injection payload',
    technique: 'MITRE T1190',
    severity: 'High',
    verdict: 'Contained',
    region: 'Dallas, US',
    owner: 'AppSec',
    note: 'Injection pattern matched WAF signature pack 8.4.',
  },
  {
    id: 'INC-2043',
    time: '12:37:02 UTC',
    source: '172.16.0.3',
    target: 'finance-db-02',
    event: 'Suspicious database enumeration',
    technique: 'MITRE T1018',
    severity: 'Medium',
    verdict: 'Monitoring',
    region: 'Mumbai, IN',
    owner: 'Data Sec',
    note: 'Multiple schema queries from a trusted subnet boundary.',
  },
  {
    id: 'INC-2044',
    time: '12:34:19 UTC',
    source: '91.134.0.9',
    target: 'workstation-114',
    event: 'Malware hash detonation',
    technique: 'MITRE T1204',
    severity: 'Critical',
    verdict: 'Quarantined',
    region: 'Warsaw, PL',
    owner: 'EDR',
    note: 'Binary blocked at execution with sandbox verdict 99.7.',
  },
  {
    id: 'INC-2045',
    time: '12:31:56 UTC',
    source: '193.120.44.8',
    target: 'cdn-edge-05',
    event: 'Geo-velocity anomaly',
    technique: 'MITRE T1078',
    severity: 'High',
    verdict: 'Escalated',
    region: 'Sao Paulo, BR',
    owner: 'IAM',
    note: 'Session jump from APAC to LATAM within 4 minutes.',
  },
  {
    id: 'INC-2046',
    time: '12:28:11 UTC',
    source: '10.24.14.7',
    target: 'internal-bastion',
    event: 'Privileged command burst',
    technique: 'MITRE T1059',
    severity: 'Low',
    verdict: 'Reviewed',
    region: 'Bengaluru, IN',
    owner: 'Platform',
    note: 'Commands match automation template after allowlist check.',
  },
  {
    id: 'INC-2047',
    time: '12:22:40 UTC',
    source: '88.198.57.1',
    target: 'mail-relay-02',
    event: 'Phishing attachment delivery',
    technique: 'MITRE T1204',
    severity: 'High',
    verdict: 'Blocked',
    region: 'Frankfurt, DE',
    owner: 'Messaging',
    note: 'Attachment sandbox hit macro-based download chain.',
  },
  {
    id: 'INC-2048',
    time: '12:18:13 UTC',
    source: '203.0.113.51',
    target: 'k8s-ingress',
    event: 'Port scan with service probe',
    technique: 'MITRE T1046',
    severity: 'Medium',
    verdict: 'Observed',
    region: 'Singapore, SG',
    owner: 'Cloud',
    note: 'Probe set covered 42 services in under 20 seconds.',
  },
];

const severityTone = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

const severityIcons = {
  Critical: ShieldX,
  High: AlertTriangle,
  Medium: ShieldAlert,
  Low: ShieldCheck,
};

const severityFilters = ['All', 'Critical', 'High', 'Medium', 'Low'];

const filterChips = [
  { id: 'all', label: 'All Events' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'contained', label: 'Contained' },
  { id: 'monitoring', label: 'Monitoring' },
];

const ThreatLogsPage = () => {
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('All');
  const [verdict, setVerdict] = useState('all');
  const [selectedId, setSelectedId] = useState(logRows[0].id);
  const [banner, setBanner] = useState('');

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logRows.filter((row) => {
      const matchesQuery = !q || [row.id, row.source, row.target, row.event, row.technique, row.region, row.owner].some((field) => field.toLowerCase().includes(q));
      const matchesSeverity = severity === 'All' || row.severity === severity;
      const matchesVerdict = verdict === 'all' || row.verdict.toLowerCase() === verdict;
      return matchesQuery && matchesSeverity && matchesVerdict;
    });
  }, [query, severity, verdict]);

  const selectedLog = filteredLogs.find((row) => row.id === selectedId) || filteredLogs[0] || logRows[0];

  const stats = useMemo(() => ({
    total: filteredLogs.length,
    blocked: filteredLogs.filter((row) => row.verdict === 'Blocked').length,
    critical: filteredLogs.filter((row) => row.severity === 'Critical').length,
    escalated: filteredLogs.filter((row) => row.verdict === 'Escalated').length,
  }), [filteredLogs]);

  const handleAction = (message) => {
    setBanner(message);
    window.setTimeout(() => setBanner(''), 2800);
  };

  return (
    <div className="page-shell logs-page">
      <section className="page-hero">
        <div>
          <p className="page-kicker mono">Operations / Threat Logs</p>
          <h1 className="page-title">Threat Logs</h1>
          <p className="page-copy">High-fidelity incident telemetry with search, verdict filters, and response actions aligned to SOC workflows.</p>
        </div>
        <div className="action-group">
          <button type="button" className="ui-button ghost"><Download size={14} /> Export CSV</button>
          <button type="button" className="ui-button ghost"><Radar size={14} /> Live Hunt</button>
          <button type="button" className="ui-button primary" onClick={() => handleAction('All visible incidents queued for acknowledgement.')}>Acknowledge Feed</button>
        </div>
      </section>

      {banner ? <div className="status-banner">{banner}</div> : null}

      <section className="stats-grid">
        <article className="panel stat-panel">
          <div className="panel-title">Visible logs</div>
          <div className="stat-number mono">{stats.total}</div>
        </article>
        <article className="panel stat-panel">
          <div className="panel-title">Blocked</div>
          <div className="stat-number mono">{stats.blocked}</div>
        </article>
        <article className="panel stat-panel">
          <div className="panel-title">Critical</div>
          <div className="stat-number mono">{stats.critical}</div>
        </article>
        <article className="panel stat-panel">
          <div className="panel-title">Escalated</div>
          <div className="stat-number mono">{stats.escalated}</div>
        </article>
      </section>

      <section className="logs-layout">
        <article className="panel logs-feed">
          <div className="panel-head">
            <div>
              <div className="panel-title">Incident stream</div>
              <div className="panel-subtitle">{filteredLogs.length} events matched the current filters</div>
            </div>
            <div className="chips-row">
              {severityFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`ui-chip ${severity === item ? 'is-active' : ''}`}
                  onClick={() => setSeverity(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-body logs-toolbar">
            <label className="search-wrap">
              <Search size={16} />
              <input
                className="ui-field"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search incident, source, target, owner, or MITRE technique"
              />
            </label>

            <div className="filters-inline">
              {filterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`ui-button filter-button ${verdict === chip.id ? 'is-active' : ''}`}
                  onClick={() => setVerdict(chip.id)}
                >
                  <Filter size={14} />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="table-shell">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Source</th>
                  <th>Target</th>
                  <th>Incident</th>
                  <th>Technique</th>
                  <th>Severity</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((row) => {
                  const SeverityIcon = severityIcons[row.severity];
                  return (
                    <tr
                      key={row.id}
                      className={row.id === selectedId ? 'is-selected' : ''}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="mono muted">{row.time}</td>
                      <td className="mono">{row.source}</td>
                      <td>{row.target}</td>
                      <td>
                        <div className="incident-cell">
                          <span>{row.event}</span>
                          <span className="incident-meta">{row.owner}</span>
                        </div>
                      </td>
                      <td className="muted">{row.technique}</td>
                      <td>
                        <span className={`severity-pill ${severityTone[row.severity]}`}>
                          <SeverityIcon size={12} />
                          {row.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`verdict-pill ${row.verdict.toLowerCase()}`}>{row.verdict}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="panel logs-inspector">
          <div className="panel-head">
            <div>
              <div className="panel-title">Selected incident</div>
              <div className="panel-subtitle mono">{selectedLog.id}</div>
            </div>
            <span className={`ui-chip verdict-pill ${selectedLog.verdict.toLowerCase()}`}>{selectedLog.verdict}</span>
          </div>

          <div className="panel-body inspector-stack">
            <div>
              <div className="inspector-label">Incident</div>
              <div className="inspector-value">{selectedLog.event}</div>
              <p className="inspector-copy">{selectedLog.note}</p>
            </div>

            <div className="inspector-grid">
              <div>
                <div className="inspector-label">Source</div>
                <div className="mono inspector-value">{selectedLog.source}</div>
              </div>
              <div>
                <div className="inspector-label">Target</div>
                <div className="inspector-value">{selectedLog.target}</div>
              </div>
              <div>
                <div className="inspector-label">Region</div>
                <div className="inspector-value">{selectedLog.region}</div>
              </div>
              <div>
                <div className="inspector-label">Owner</div>
                <div className="inspector-value">{selectedLog.owner}</div>
              </div>
            </div>

            <div className="evidence-card">
              <div className="evidence-header">
                <Target size={14} /> Response playbook
              </div>
              <ul className="evidence-list">
                <li>Capture packet and endpoint metadata.</li>
                <li>Correlate with active identity sessions.</li>
                <li>Escalate to containment if confidence is above threshold.</li>
              </ul>
            </div>

            <div className="action-grid">
              <button type="button" className="ui-button primary" onClick={() => handleAction(`${selectedLog.id} moved to containment queue.`)}>Contain</button>
              <button type="button" className="ui-button ghost" onClick={() => handleAction(`${selectedLog.id} marked for analyst review.`)}>Review</button>
              <button type="button" className="ui-button ghost" onClick={() => handleAction(`${selectedLog.id} exported to case file.`)}>Case Export</button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default ThreatLogsPage;