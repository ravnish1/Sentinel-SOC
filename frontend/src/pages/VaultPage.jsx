import React, { useMemo, useState } from 'react';
import { Copy, Download, LockKeyhole, RotateCcw, Shield, ShieldCheck } from 'lucide-react';
import './SocModule.css';

const vaultItems = [
  { id: 'case-191', label: 'Case 191', type: 'Incident bundle', classification: 'Restricted', owner: 'SOC Lead', status: 'Locked', age: '2h' },
  { id: 'cred-441', label: 'Service credential batch', type: 'Secret set', classification: 'Secret', owner: 'Platform', status: 'Encrypted', age: '18m' },
  { id: 'ioc-034', label: 'Threat intel pack', type: 'Indicator set', classification: 'Internal', owner: 'Intel', status: 'Indexed', age: '4h' },
  { id: 'audit-118', label: 'Audit evidence bundle', type: 'Evidence archive', classification: 'Restricted', owner: 'GRC', status: 'Locked', age: '1d' },
];

const accessLog = [
  { who: 'M. Chen', what: 'Case 191 opened', when: '07:10' },
  { who: 'J. Patel', what: 'Credential batch rotated', when: '07:42' },
  { who: 'SOC Bot', what: 'Evidence bundle indexed', when: '08:02' },
  { who: 'A. Gomez', what: 'Vault export request denied', when: '08:33' },
];

const VaultPage = () => {
  const [selectedId, setSelectedId] = useState(vaultItems[0].id);
  const [banner, setBanner] = useState('');

  const selected = useMemo(() => vaultItems.find((item) => item.id === selectedId) || vaultItems[0], [selectedId]);

  const stats = useMemo(() => ({
    stored: vaultItems.length,
    encrypted: vaultItems.filter((item) => item.status === 'Encrypted').length,
    reviews: 3,
    rotates: 2,
  }), []);

  const actionBanner = (text) => {
    setBanner(text);
    window.setTimeout(() => setBanner(''), 2200);
  };

  return (
    <div className="page-shell soc-module">
      <section className="page-hero">
        <div>
          <p className="page-kicker mono">Protected Data / Vault</p>
          <h1 className="page-title">Vault</h1>
          <p className="page-copy">Secure incident bundles, secrets, and evidence with analyst-friendly access controls.</p>
        </div>
        <div className="action-group">
          <button type="button" className="ui-button ghost"><Download size={14} /> Export bundle</button>
          <button type="button" className="ui-button primary"><LockKeyhole size={14} /> New secret</button>
        </div>
      </section>

      {banner ? <div className="status-banner">{banner}</div> : null}

      <section className="soc-summary-grid">
        <article className="panel soc-summary-card"><div className="soc-summary-label">Stored artifacts</div><div className="soc-summary-value mono">{stats.stored}</div><div className="soc-summary-copy">Protected bundles and case material</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Encrypted items</div><div className="soc-summary-value mono">{stats.encrypted}</div><div className="soc-summary-copy">Secrets and credential packs</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Access reviews</div><div className="soc-summary-value mono">{stats.reviews}</div><div className="soc-summary-copy">Pending privileged access checks</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Rotations due</div><div className="soc-summary-value mono">{stats.rotates}</div><div className="soc-summary-copy">Keys queued for refresh</div></article>
      </section>

      <section className="soc-module-grid">
        <article className="panel soc-list-panel">
          <div className="soc-section-head">
            <div>
              <h2>Vault inventory</h2>
              <p>Click an artifact to inspect its classification and access state.</p>
            </div>
          </div>

          <div className="soc-line-list" style={{ marginTop: '12px' }}>
            {vaultItems.map((item) => (
              <button key={item.id} type="button" className={`soc-detail-row ${selected.id === item.id ? 'is-active' : ''}`} onClick={() => setSelectedId(item.id)}>
                <div>
                  <span>{item.type}</span>
                  <strong>{item.label}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`soc-pill ${item.classification === 'Secret' ? 'warn' : 'good'}`}>{item.classification}</div>
                  <div className="soc-line-meta mono" style={{ marginTop: '6px' }}>{item.status} • {item.age}</div>
                </div>
              </button>
            ))}
          </div>
        </article>

        <aside className="panel soc-detail-panel">
          <div className="soc-section-head">
            <div>
              <h2>{selected.label}</h2>
              <p>Classification, ownership, and quick actions.</p>
            </div>
            <span className="soc-pill good">{selected.status}</span>
          </div>

          <div className="soc-detail-stack" style={{ marginTop: '12px' }}>
            <div className="soc-detail-row"><div><span>Type</span><strong>{selected.type}</strong></div><Shield size={14} color="#f97316" /></div>
            <div className="soc-detail-row"><div><span>Owner</span><strong>{selected.owner}</strong></div></div>
            <div className="soc-detail-row"><div><span>Age</span><strong>{selected.age}</strong></div></div>
            <div className="soc-detail-row"><div><span>Classification</span><strong>{selected.classification}</strong></div></div>

            <div className="soc-metadata-grid">
              <div className="soc-metadata-card"><span>Retention</span><strong>90 days</strong></div>
              <div className="soc-metadata-card"><span>Access level</span><strong>Analyst + Lead</strong></div>
            </div>

            <div className="soc-action-row">
              <button type="button" className="ui-button primary" onClick={() => actionBanner(`${selected.label} copied to case file.`)}><Copy size={14} /> Copy</button>
              <button type="button" className="ui-button ghost" onClick={() => actionBanner(`${selected.label} rotation queued.`)}><RotateCcw size={14} /> Rotate</button>
              <button type="button" className="ui-button ghost" onClick={() => actionBanner(`${selected.label} export denied for non-admin users.`)}>Export</button>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel soc-stack-panel">
        <div className="soc-section-head">
          <div>
            <h2>Access activity</h2>
            <p>Recent vault access and security events.</p>
          </div>
        </div>
        <div className="soc-line-list" style={{ marginTop: '12px' }}>
          {accessLog.map((entry) => (
            <div key={entry.what} className="soc-line-item">
              <span>{entry.who} • {entry.what}</span>
              <span className="soc-line-meta mono">{entry.when}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default VaultPage;
