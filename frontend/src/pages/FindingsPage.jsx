import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, Search, ShieldAlert, Target } from 'lucide-react';
import { useThreatEngine } from '../hooks/useThreatEngine';
import { downloadCsv, sparklinePoints } from './socPageUtils';
import './SocModule.css';

const severityFilters = ['All', 'Critical', 'High', 'Medium', 'Low'];

function toFinding(log, index) {
  const severity = log.severity || 'Low';
  const asset = log.source?.startsWith('192.168') || log.source?.startsWith('10.') ? log.target || 'internal-asset' : log.target || 'external-exposure';
  return {
    id: log.id ?? `finding-${index}`,
    cve: `CVE-${2026 - (index % 3)}-${(1200 + index * 13).toString().slice(-4)}`,
    asset,
    indicator: log.indicator || log.source,
    threatType: log.type ? String(log.type).toUpperCase() : 'ANOMALY',
    severity,
    score: Math.max(40, 98 - index * 4 - (severity === 'Critical' ? 12 : severity === 'High' ? 6 : 0)),
    status: severity === 'Critical' ? 'Urgent' : severity === 'High' ? 'Investigating' : 'Monitoring',
    owner: index % 2 === 0 ? 'Platform Sec' : 'AppSec',
    evidence: log.event || 'Suspicious behavior detected',
    region: log.source?.startsWith('185.') ? 'EMEA' : log.source?.startsWith('45.') ? 'North America' : 'Global',
  };
}

const FindingsPage = () => {
  const { logs, isLive } = useThreatEngine();
  const [severity, setSeverity] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [banner, setBanner] = useState('');

  const findings = useMemo(() => logs.map(toFinding), [logs]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return findings.filter((finding) => {
      const matchesSeverity = severity === 'All' || finding.severity === severity;
      const matchesQuery = !needle || [finding.cve, finding.asset, finding.indicator, finding.threatType, finding.status, finding.owner].join(' ').toLowerCase().includes(needle);
      return matchesSeverity && matchesQuery;
    });
  }, [findings, query, severity]);

  const selected = filtered.find((finding) => finding.id === selectedId) || filtered[0] || findings[0] || null;

  const summary = useMemo(() => ({
    open: filtered.length,
    critical: filtered.filter((finding) => finding.severity === 'Critical').length,
    exploitability: Math.round(filtered.reduce((acc, finding) => acc + finding.score, 0) / Math.max(1, filtered.length)),
    exposure: filtered.filter((finding) => finding.status !== 'Monitoring').length,
  }), [filtered]);

  const series = useMemo(() => filtered.slice(0, 6).map((finding) => finding.score), [filtered]);

  const handleExport = () => {
    if (!filtered.length) {
      setBanner('No findings available to export.');
      window.setTimeout(() => setBanner(''), 2200);
      return;
    }

    downloadCsv(filtered.map((finding) => ({
      cve: finding.cve,
      asset: finding.asset,
      indicator: finding.indicator,
      threatType: finding.threatType,
      severity: finding.severity,
      status: finding.status,
      score: finding.score,
    })), `findings-${Date.now()}.csv`, ['cve', 'asset', 'indicator', 'threatType', 'severity', 'status', 'score']);
    setBanner(`Exported ${filtered.length} findings.`);
    window.setTimeout(() => setBanner(''), 2400);
  };

  return (
    <div className="page-shell soc-module">
      <section className="page-hero">
        <div>
          <p className="page-kicker mono">Investigation / Findings</p>
          <h1 className="page-title">Findings</h1>
          <p className="page-copy">Prioritized vulnerabilities, exposure signals, and analyst context for fast triage.</p>
        </div>
        <div className="action-group">
          <button type="button" className="ui-button ghost" onClick={handleExport}><Download size={14} /> Export</button>
          <button type="button" className="ui-button primary"><ShieldAlert size={14} /> Triage Queue</button>
        </div>
      </section>

      {banner ? <div className="status-banner">{banner}</div> : null}

      <section className="soc-summary-grid">
        <article className="panel soc-summary-card">
          <div className="soc-summary-label">Open findings</div>
          <div className="soc-summary-value mono">{summary.open}</div>
          <div className="soc-summary-copy">{isLive ? 'Live telemetry is connected.' : 'Using fallback intelligence.'}</div>
        </article>
        <article className="panel soc-summary-card">
          <div className="soc-summary-label">Critical findings</div>
          <div className="soc-summary-value mono">{summary.critical}</div>
          <div className="soc-summary-trend up"><ArrowUpRight size={13} /> Escalation pressure</div>
        </article>
        <article className="panel soc-summary-card">
          <div className="soc-summary-label">Exploitability score</div>
          <div className="soc-summary-value mono">{summary.exploitability}</div>
          <svg className="soc-mini-sparkline warn" viewBox="0 0 110 28" preserveAspectRatio="none"><polyline points={sparklinePoints(series)} /></svg>
        </article>
        <article className="panel soc-summary-card">
          <div className="soc-summary-label">Exposure surface</div>
          <div className="soc-summary-value mono">{summary.exposure}</div>
          <div className="soc-summary-trend down"><ArrowDownRight size={13} /> Requires hardening</div>
        </article>
      </section>

      <section className="soc-module-grid">
        <article className="panel soc-list-panel">
          <div className="soc-section-head">
            <div>
              <h2>Prioritized Findings</h2>
              <p>Click a row to inspect the vulnerability context.</p>
            </div>
            <div className="soc-chip-row">
              {severityFilters.map((item) => (
                <button key={item} type="button" className={`soc-chip ${severity === item ? 'is-active' : ''}`} onClick={() => setSeverity(item)}>{item}</button>
              ))}
            </div>
          </div>

          <div className="soc-input-row" style={{ marginTop: '12px' }}>
            <Search size={14} />
            <input className="ui-field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search CVE, asset, indicator, or owner" />
          </div>

          <div className="soc-table-shell" style={{ marginTop: '12px' }}>
            <table className="soc-data-table">
              <thead>
                <tr>
                  <th>CVE</th>
                  <th>Asset</th>
                  <th>Indicator</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((finding) => (
                  <tr key={finding.id} className={selected?.id === finding.id ? 'is-active' : ''} onClick={() => setSelectedId(finding.id)}>
                    <td className="mono">{finding.cve}</td>
                    <td>{finding.asset}</td>
                    <td className="mono">{finding.indicator}</td>
                    <td><span className={`soc-pill ${finding.severity.toLowerCase()}`}>{finding.severity}</span></td>
                    <td>{finding.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="panel soc-detail-panel">
          <div className="soc-section-head">
            <div>
              <h2>Finding Detail</h2>
              <p>Exploitability, owner, and recommended remediation.</p>
            </div>
            <span className={`soc-pill ${selected?.severity?.toLowerCase() || 'low'}`}>{selected?.severity || 'Low'}</span>
          </div>

          <div className="soc-detail-stack" style={{ marginTop: '12px' }}>
            <div className="soc-detail-row">
              <div>
                <span>Risk score</span>
                <strong className="mono">{selected?.score ?? '--'}</strong>
              </div>
              <Target size={14} color="#f97316" />
            </div>
            <div className="soc-detail-row">
              <div>
                <span>Threat type</span>
                <strong>{selected?.threatType || '-'}</strong>
              </div>
              <div className="mono">{selected?.region || 'Global'}</div>
            </div>
            <div className="soc-detail-row">
              <div>
                <span>Evidence</span>
                <strong>{selected?.evidence || '-'}</strong>
              </div>
            </div>
            <div className="soc-detail-row">
              <div>
                <span>Recommended action</span>
                <strong>{selected?.severity === 'Critical' ? 'Patch immediately and isolate exposed assets' : 'Validate exposure and schedule remediation'}</strong>
              </div>
            </div>

            <div className="soc-progress">
              <div className="soc-summary-label">Mean exploitability</div>
              <div className="soc-progress-track">
                <span className="soc-progress-fill" style={{ width: `${Math.min(100, summary.exploitability)}%` }} />
              </div>
            </div>

            <div className="soc-action-row">
              <button type="button" className="ui-button primary">Create fix task</button>
              <button type="button" className="ui-button ghost">Mark reviewed</button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default FindingsPage;
