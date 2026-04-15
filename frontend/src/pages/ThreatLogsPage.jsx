import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download, Filter, Radar, Search, ShieldAlert, ShieldCheck, ShieldX, Target } from 'lucide-react';
import { useThreatEngine } from '../hooks/useThreatEngine';
import './ThreatLogsPage.css';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// Fallback sample logs for demo purposes
const fallbackLogRows = [
  {
    id: 1,
    timestamp: '12:41:08',
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
    id: 2,
    timestamp: '12:39:44',
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
  // Use real threat engine for live data
  const { logs: threatLogs, isLive } = useThreatEngine();
  
  // Convert threat logs to table format
  const logRows = threatLogs.length > 0 ? threatLogs.map((log) => ({
    id: log.id,
    time: log.timestamp,
    source: log.source,
    target: log.source.startsWith('192.168') || log.source.startsWith('10.') || log.source.startsWith('172.16') ? 'internal-system' : 'external',
    event: log.event,
    technique: 'MITRE T1110',
    severity: log.severity,
    verdict: log.severity === 'Critical' ? 'Blocked' : log.severity === 'High' ? 'Contained' : 'Monitoring',
    region: 'Threat Feed',
    owner: log.source || 'OTX',
    note: `Indicator: ${log.indicator} (${log.type})`,
  })) : fallbackLogRows;

  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('All');
  const [verdict, setVerdict] = useState('all');
  const [selectedId, setSelectedId] = useState(logRows[0]?.id);
  const [banner, setBanner] = useState('');
  const [isHunting, setIsHunting] = useState(false);

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logRows.filter((row) => {
      const matchesQuery = !q || [row.id, row.source, row.target, row.event, row.technique, row.region, row.owner].some((field) => String(field).toLowerCase().includes(q));
      const matchesSeverity = severity === 'All' || row.severity === severity;
      const matchesVerdict = verdict === 'all' || row.verdict.toLowerCase() === verdict;
      return matchesQuery && matchesSeverity && matchesVerdict;
    });
  }, [query, severity, verdict, logRows]);

  const selectedLog = filteredLogs.find((row) => row.id === selectedId) || filteredLogs[0] || logRows[0] || fallbackLogRows[0];

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

  const handleExportCsv = () => {
    if (!filteredLogs.length) {
      setBanner('No filtered logs available for export.');
      window.setTimeout(() => setBanner(''), 2600);
      return;
    }

    const columns = ['id', 'time', 'source', 'target', 'event', 'technique', 'severity', 'verdict', 'region', 'owner', 'note'];
    const csv = [
      columns.join(','),
      ...filteredLogs.map((row) => columns.map((column) => {
        const value = row[column] == null ? '' : String(row[column]);
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `threat-logs-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setBanner(`Exported ${filteredLogs.length} incident rows.`);
    window.setTimeout(() => setBanner(''), 2800);
  };

  const handleLiveHunt = async () => {
    try {
      setIsHunting(true);
      setBanner('Live Hunt started. Triggering immediate poller cycle...');

      const response = await fetch(`${API_BASE_URL}/api/poller/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
      }

      const inserted = payload?.feeds?.otx?.inserted ?? 0;
      const fetched = payload?.feeds?.otx?.fetched ?? 0;
      setBanner(`Live Hunt completed. OTX fetched: ${fetched}, inserted: ${inserted}.`);
    } catch (error) {
      setBanner(`Live Hunt failed: ${error.message}`);
    } finally {
      setIsHunting(false);
      window.setTimeout(() => setBanner(''), 3800);
    }
  };

  return (
    <div className="page-shell logs-page">
      <section className="page-hero">
        <div>
          <p className="page-kicker mono">Operations / Threat Logs</p>
          <h1 className="page-title">Threat Logs</h1>
          <p className="page-copy">High-fidelity incident telemetry with search, verdict filters, and response actions aligned to SOC workflows.</p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isLive ? '#10b981' : '#f59e0b' }}></span>
            <span style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
              {isLive ? 'LIVE BACKEND CONNECTED' : 'FALLBACK MODE - Backend Unavailable'}
            </span>
          </div>
        </div>
        <div className="action-group">
          <button type="button" className="ui-button ghost" onClick={handleExportCsv}><Download size={14} /> Export CSV</button>
          <button type="button" className="ui-button ghost" onClick={handleLiveHunt} disabled={isHunting}>
            <Radar size={14} /> {isHunting ? 'Hunting...' : 'Live Hunt'}
          </button>
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