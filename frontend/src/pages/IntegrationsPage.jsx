import React, { useMemo, useState } from 'react';
import { PlugZap, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import './SocModule.css';

const connectors = [
  { name: 'Splunk SIEM', status: 'Connected', lag: '14s', coverage: 92, tone: 'good', kind: 'SIEM' },
  { name: 'CrowdStrike EDR', status: 'Healthy', lag: '22s', coverage: 88, tone: 'good', kind: 'EDR' },
  { name: 'Slack Response', status: 'Healthy', lag: '40s', coverage: 95, tone: 'good', kind: 'ChatOps' },
  { name: 'Cloudflare WAF', status: 'Warning', lag: '3m', coverage: 74, tone: 'warn', kind: 'Edge' },
  { name: 'Email Gateway', status: 'Connected', lag: '18s', coverage: 89, tone: 'good', kind: 'Mail' },
];

const eventMappings = [
  { source: 'OTX feed', target: 'Threat logs', health: 'Pass' },
  { source: 'EDR telemetry', target: 'Incidents', health: 'Pass' },
  { source: 'WAF blocks', target: 'Findings', health: 'Warn' },
  { source: 'Slack alerts', target: 'Response queue', health: 'Pass' },
];

const syncTrail = [
  { step: 'OTX import', when: '08:01', state: 'Done' },
  { step: 'CrowdStrike sync', when: '08:04', state: 'Done' },
  { step: 'WAF webhook', when: '08:09', state: 'Warn' },
  { step: 'Slack dispatch', when: '08:10', state: 'Done' },
];

const IntegrationsPage = () => {
  const [selectedId, setSelectedId] = useState(connectors[0].name);

  const selected = useMemo(() => connectors.find((connector) => connector.name === selectedId) || connectors[0], [selectedId]);
  const stats = useMemo(() => ({
    connected: connectors.filter((connector) => connector.status === 'Connected' || connector.status === 'Healthy').length,
    lagging: connectors.filter((connector) => connector.tone === 'warn').length,
    coverage: Math.round(connectors.reduce((acc, connector) => acc + connector.coverage, 0) / connectors.length),
    failovers: 1,
  }), []);

  return (
    <div className="page-shell soc-module">
      <section className="page-hero">
        <div>
          <p className="page-kicker mono">Platform / Integrations</p>
          <h1 className="page-title">Integrations</h1>
          <p className="page-copy">Connected feeds, response tooling, and security telemetry mappings live here.</p>
        </div>
        <div className="action-group">
          <button type="button" className="ui-button ghost"><RefreshCw size={14} /> Sync now</button>
          <button type="button" className="ui-button primary"><Plus size={14} /> Add integration</button>
        </div>
      </section>

      <section className="soc-summary-grid">
        <article className="panel soc-summary-card"><div className="soc-summary-label">Connected</div><div className="soc-summary-value mono">{stats.connected}</div><div className="soc-summary-copy">Healthy and active connectors</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Lagging</div><div className="soc-summary-value mono">{stats.lagging}</div><div className="soc-summary-copy">Feeds needing attention</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Event coverage</div><div className="soc-summary-value mono">{stats.coverage}%</div><div className="soc-summary-copy">Average coverage across tooling</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Failovers</div><div className="soc-summary-value mono">{stats.failovers}</div><div className="soc-summary-copy">Resilience paths available</div></article>
      </section>

      <section className="soc-module-grid">
        <article className="panel soc-list-panel">
          <div className="soc-section-head">
            <div>
              <h2>Connector health</h2>
              <p>Click a connector to inspect its health and sync performance.</p>
            </div>
          </div>

          <div className="soc-line-list" style={{ marginTop: '12px' }}>
            {connectors.map((connector) => (
              <button key={connector.name} type="button" className={`soc-detail-row ${selected.name === connector.name ? 'is-active' : ''}`} onClick={() => setSelectedId(connector.name)}>
                <div>
                  <span>{connector.kind}</span>
                  <strong>{connector.name}</strong>
                </div>
                <div style={{ minWidth: '170px', textAlign: 'right' }}>
                  <div className={`soc-pill ${connector.tone}`}>{connector.status}</div>
                  <div className="soc-line-meta mono" style={{ marginTop: '6px' }}>{connector.lag} lag • {connector.coverage}% coverage</div>
                  <div className="soc-progress-track" style={{ marginTop: '8px' }}>
                    <span className={`soc-progress-fill ${connector.tone}`} style={{ width: `${connector.coverage}%` }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </article>

        <aside className="panel soc-detail-panel">
          <div className="soc-section-head">
            <div>
              <h2>{selected.name}</h2>
              <p>Integration status and health summary.</p>
            </div>
            <span className={`soc-pill ${selected.tone}`}>{selected.status}</span>
          </div>

          <div className="soc-detail-stack" style={{ marginTop: '12px' }}>
            <div className="soc-detail-row"><div><span>Connector type</span><strong>{selected.kind}</strong></div><PlugZap size={14} color="#f97316" /></div>
            <div className="soc-detail-row"><div><span>Lag</span><strong className="mono">{selected.lag}</strong></div></div>
            <div className="soc-detail-row"><div><span>Coverage</span><strong>{selected.coverage}%</strong></div></div>
            <div className="soc-action-row">
              <button type="button" className="ui-button primary">View mapping</button>
              <button type="button" className="ui-button ghost">Rotate key</button>
            </div>

            <div className="soc-line-list">
              {syncTrail.map((item) => (
                <div key={item.step} className="soc-line-item">
                  <span>{item.step}</span>
                  <span className="soc-line-meta mono">{item.when} • {item.state}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="panel soc-stack-panel">
        <div className="soc-section-head">
          <div>
            <h2>Event mappings</h2>
            <p>How source telemetry lands in the SOC workflow.</p>
          </div>
        </div>

        <div className="soc-table-shell" style={{ marginTop: '12px' }}>
          <table className="soc-data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Target</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {eventMappings.map((mapping) => (
                <tr key={mapping.source}>
                  <td>{mapping.source}</td>
                  <td>{mapping.target}</td>
                  <td><span className={`soc-pill ${mapping.health === 'Pass' ? 'good' : 'warn'}`}>{mapping.health}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="soc-summary-copy" style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={14} /> Built for analysts who need fast visibility into connector health and feed latency.
        </div>
      </section>
    </div>
  );
};

export default IntegrationsPage;
