import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, ChevronRight, Clock3, Download, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useThreatEngine } from '../hooks/useThreatEngine';
import { downloadCsv, sparklinePoints } from './socPageUtils';
import './SocModule.css';

const incidentStates = ['All', 'Open', 'Investigating', 'Contained', 'Closed'];

function toIncident(log, index) {
  const severity = log.severity || 'Low';
  const state = severity === 'Critical' ? 'Open' : severity === 'High' ? 'Investigating' : severity === 'Medium' ? 'Contained' : 'Closed';
  return {
    id: log.id ?? `incident-${index}`,
    title: log.event || 'Unusual activity detected',
    source: log.source,
    target: log.source?.startsWith('192.168') ? 'internal-services' : 'edge-tier',
    state,
    severity,
    owner: index % 2 === 0 ? 'SOC Tier 1' : 'Incident Commander',
    age: `${index + 8}m`,
    sla: severity === 'Critical' ? '5m' : severity === 'High' ? '15m' : '30m',
    playbook: severity === 'Critical' ? 'Containment' : 'Validate + monitor',
    timeline: [4, 7, 6, 9, 11, 10, 14, 18].map((point) => Math.max(1, point - index)),
  };
}

const IncidentsPage = () => {
  const { logs } = useThreatEngine();
  const [stateFilter, setStateFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [banner, setBanner] = useState('');

  const incidents = useMemo(() => logs.map(toIncident), [logs]);
  const filtered = useMemo(() => incidents.filter((incident) => stateFilter === 'All' || incident.state === stateFilter), [incidents, stateFilter]);
  const selected = filtered.find((incident) => incident.id === selectedId) || filtered[0] || incidents[0] || null;

  const stats = useMemo(() => ({
    open: incidents.filter((incident) => incident.state === 'Open').length,
    investigating: incidents.filter((incident) => incident.state === 'Investigating').length,
    contained: incidents.filter((incident) => incident.state === 'Contained').length,
    slaBreach: incidents.filter((incident) => incident.sla === '5m').length,
  }), [incidents]);

  const handleExport = () => {
    downloadCsv(filtered.map((incident) => ({
      title: incident.title,
      source: incident.source,
      target: incident.target,
      state: incident.state,
      severity: incident.severity,
      owner: incident.owner,
      age: incident.age,
    })), `incidents-${Date.now()}.csv`, ['title', 'source', 'target', 'state', 'severity', 'owner', 'age']);
    setBanner(`Exported ${filtered.length} incident rows.`);
    window.setTimeout(() => setBanner(''), 2400);
  };

  const actionBanner = (text) => {
    setBanner(text);
    window.setTimeout(() => setBanner(''), 2400);
  };

  return (
    <div className="page-shell soc-module">
      <section className="page-hero">
        <div>
          <p className="page-kicker mono">Response / Incidents</p>
          <h1 className="page-title">Incidents</h1>
          <p className="page-copy">Active response queue with owner assignment, SLA pressure, and drill-down triage.</p>
        </div>
        <div className="action-group">
          <button type="button" className="ui-button ghost" onClick={handleExport}><Download size={14} /> Export</button>
          <button type="button" className="ui-button primary"><Clock3 size={14} /> New escalation</button>
        </div>
      </section>

      {banner ? <div className="status-banner">{banner}</div> : null}

      <section className="soc-summary-grid">
        <article className="panel soc-summary-card"><div className="soc-summary-label">Open incidents</div><div className="soc-summary-value mono">{stats.open}</div><div className="soc-summary-copy">Immediate response required</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Investigating</div><div className="soc-summary-value mono">{stats.investigating}</div><div className="soc-summary-copy">Analyst triage in progress</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Contained</div><div className="soc-summary-value mono">{stats.contained}</div><svg className="soc-mini-sparkline good" viewBox="0 0 110 28" preserveAspectRatio="none"><polyline points={sparklinePoints(selected?.timeline || [])} /></svg></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">SLA pressure</div><div className="soc-summary-value mono">{stats.slaBreach}</div><div className="soc-summary-trend down"><ArrowRight size={13} /> Watch response clock</div></article>
      </section>

      <section className="soc-module-grid">
        <article className="panel soc-list-panel">
          <div className="soc-section-head">
            <div>
              <h2>Incident Queue</h2>
              <p>Filter the active queue and click a row to open the response context.</p>
            </div>
            <div className="soc-chip-row">
              {incidentStates.map((state) => (
                <button key={state} type="button" className={`soc-chip ${stateFilter === state ? 'is-active' : ''}`} onClick={() => setStateFilter(state)}>{state}</button>
              ))}
            </div>
          </div>

          <div className="soc-line-list" style={{ marginTop: '12px' }}>
            {filtered.map((incident) => (
              <button key={incident.id} type="button" className={`feed-item ${selected?.id === incident.id ? 'is-active' : ''}`} onClick={() => setSelectedId(incident.id)}>
                <span className={`feed-icon tone-${incident.severity === 'Critical' ? 'critical' : incident.severity === 'High' ? 'warning' : incident.severity === 'Medium' ? 'info' : 'healthy'}`}>
                  {incident.severity === 'Critical' ? <AlertTriangle size={14} /> : incident.severity === 'High' ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                </span>
                <div className="feed-copy">
                  <div className="feed-row">
                    <strong>{incident.title}</strong>
                    <span className={`feed-severity tone-${incident.severity === 'Critical' ? 'critical' : incident.severity === 'High' ? 'warning' : incident.severity === 'Medium' ? 'info' : 'healthy'}`}>{incident.state}</span>
                  </div>
                  <p>{incident.source} • {incident.target} • owner {incident.owner}</p>
                </div>
                <ChevronRight size={14} className="feed-chevron" />
              </button>
            ))}
          </div>
        </article>

        <aside className="panel soc-detail-panel">
          <div className="soc-section-head">
            <div>
              <h2>Incident Detail</h2>
              <p>Playbook, SLA, and quick response actions.</p>
            </div>
            <span className={`soc-pill ${selected?.severity?.toLowerCase() || 'low'}`}>{selected?.severity || 'Low'}</span>
          </div>

          <div className="soc-detail-stack" style={{ marginTop: '12px' }}>
            <div className="soc-detail-row"><div><span>Incident</span><strong>{selected?.title || 'No incident selected'}</strong></div></div>
            <div className="soc-detail-row"><div><span>Owner</span><strong>{selected?.owner || '-'}</strong></div></div>
            <div className="soc-detail-row"><div><span>SLA</span><strong className="mono">{selected?.sla || '-'}</strong></div></div>
            <div className="soc-detail-row"><div><span>Playbook</span><strong>{selected?.playbook || '-'}</strong></div></div>

            <div className="soc-progress">
              <div className="soc-summary-label">Response pressure</div>
              <div className="soc-progress-track"><span className="soc-progress-fill warn" style={{ width: `${Math.min(100, (selected?.severity === 'Critical' ? 90 : selected?.severity === 'High' ? 72 : 48) || 0)}%` }} /></div>
            </div>

            <div className="soc-metadata-grid">
              <div className="soc-metadata-card"><span>Age</span><strong>{selected?.age || '-'}</strong></div>
              <div className="soc-metadata-card"><span>Queue state</span><strong>{selected?.state || '-'}</strong></div>
            </div>

            <div className="soc-action-row">
              <button type="button" className="ui-button primary" onClick={() => actionBanner(`${selected?.id || 'Incident'} moved to containment.`)}>Contain</button>
              <button type="button" className="ui-button ghost" onClick={() => actionBanner(`${selected?.id || 'Incident'} escalated to commander.`)}>Escalate</button>
              <button type="button" className="ui-button ghost" onClick={() => actionBanner(`${selected?.id || 'Incident'} added to case file.`)}>Case note</button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default IncidentsPage;
