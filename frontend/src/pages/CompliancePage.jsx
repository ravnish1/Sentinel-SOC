import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, ShieldCheck, TriangleAlert } from 'lucide-react';
import './SocModule.css';

const frameworks = [
  { id: 'nist', name: 'NIST CSF', score: 88, drift: 4, controls: 19, gaps: 2, tone: 'good' },
  { id: 'iso', name: 'ISO 27001', score: 81, drift: 7, controls: 23, gaps: 4, tone: 'warn' },
  { id: 'soc2', name: 'SOC 2', score: 76, drift: 6, controls: 18, gaps: 5, tone: 'warn' },
];

const controlRows = [
  { control: 'MFA enforced', framework: 'All', status: 'Pass', owner: 'Identity', evidence: 'Policy updated 2d ago' },
  { control: 'Log retention', framework: 'NIST', status: 'Pass', owner: 'Platform', evidence: '30-day retention validated' },
  { control: 'Vendor access review', framework: 'SOC 2', status: 'Warn', owner: 'GRC', evidence: '4 reviews overdue' },
  { control: 'Secure change approval', framework: 'ISO', status: 'Pass', owner: 'Engineering', evidence: 'CAB process active' },
  { control: 'Privileged access recertification', framework: 'All', status: 'Warn', owner: 'IAM', evidence: '3 admin accounts pending' },
];

const auditTrail = [
  { step: 'Evidence collected', time: '08:12', status: 'Done' },
  { step: 'Control owners notified', time: '09:05', status: 'Done' },
  { step: 'Exception review', time: '10:30', status: 'Pending' },
  { step: 'Auditor packet generated', time: '12:00', status: 'Planned' },
];

const CompliancePage = () => {
  const [selectedFramework, setSelectedFramework] = useState('nist');

  const activeFramework = frameworks.find((framework) => framework.id === selectedFramework) || frameworks[0];

  const stats = useMemo(() => ({
    score: Math.round(frameworks.reduce((acc, framework) => acc + framework.score, 0) / frameworks.length),
    openGaps: frameworks.reduce((acc, framework) => acc + framework.gaps, 0),
    overdue: frameworks.reduce((acc, framework) => acc + framework.drift, 0),
    readiness: 94,
  }), []);

  return (
    <div className="page-shell soc-module">
      <section className="page-hero">
        <div>
          <p className="page-kicker mono">Governance / Compliance</p>
          <h1 className="page-title">Compliance</h1>
          <p className="page-copy">Track control posture, drift, and audit readiness across frameworks without leaving the console.</p>
        </div>
        <div className="action-group">
          <button type="button" className="ui-button ghost"><Download size={14} /> Export report</button>
          <button type="button" className="ui-button primary"><ShieldCheck size={14} /> Audit packet</button>
        </div>
      </section>

      <section className="soc-summary-grid">
        <article className="panel soc-summary-card"><div className="soc-summary-label">Average score</div><div className="soc-summary-value mono">{stats.score}%</div><div className="soc-summary-copy">Across NIST, ISO 27001, and SOC 2</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Open gaps</div><div className="soc-summary-value mono">{stats.openGaps}</div><div className="soc-summary-trend down"><TriangleAlert size={13} /> Needs closure</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Overdue controls</div><div className="soc-summary-value mono">{stats.overdue}</div><div className="soc-summary-copy">Controls drifting from target state</div></article>
        <article className="panel soc-summary-card"><div className="soc-summary-label">Audit readiness</div><div className="soc-summary-value mono">{stats.readiness}%</div><div className="soc-summary-trend up"><CheckCircle2 size={13} /> Evidence is in good shape</div></article>
      </section>

      <section className="soc-module-grid">
        <article className="panel soc-list-panel">
          <div className="soc-section-head">
            <div>
              <h2>Framework posture</h2>
              <p>Switch between frameworks to inspect score drift and control coverage.</p>
            </div>
            <div className="soc-chip-row">
              {frameworks.map((framework) => (
                <button key={framework.id} type="button" className={`soc-chip ${selectedFramework === framework.id ? 'is-active' : ''}`} onClick={() => setSelectedFramework(framework.id)}>{framework.name}</button>
              ))}
            </div>
          </div>

          <div className="soc-line-list" style={{ marginTop: '12px' }}>
            {frameworks.map((framework) => (
              <button key={framework.id} type="button" className="soc-detail-row" onClick={() => setSelectedFramework(framework.id)}>
                <div>
                  <span>{framework.name}</span>
                  <strong>{framework.controls} active controls</strong>
                </div>
                <div style={{ minWidth: '180px' }}>
                  <div className="soc-progress-track">
                    <span className={`soc-progress-fill ${framework.tone}`} style={{ width: `${framework.score}%` }} />
                  </div>
                  <div className="soc-summary-copy" style={{ marginTop: '6px' }}>{framework.score}% score • {framework.gaps} gaps • {framework.drift} overdue</div>
                </div>
              </button>
            ))}
          </div>
        </article>

        <aside className="panel soc-detail-panel">
          <div className="soc-section-head">
            <div>
              <h2>{activeFramework.name}</h2>
              <p>Current framework detail and audit trail.</p>
            </div>
            <span className={`soc-pill ${activeFramework.tone}`}>{activeFramework.score}%</span>
          </div>

          <div className="soc-detail-stack" style={{ marginTop: '12px' }}>
            <div className="soc-detail-row"><div><span>Controls</span><strong>{activeFramework.controls}</strong></div></div>
            <div className="soc-detail-row"><div><span>Gaps</span><strong>{activeFramework.gaps}</strong></div></div>
            <div className="soc-detail-row"><div><span>Drift</span><strong>{activeFramework.drift} items</strong></div></div>

            <div className="soc-progress">
              <div className="soc-summary-label">Control coverage</div>
              <div className="soc-progress-track"><span className={`soc-progress-fill ${activeFramework.tone}`} style={{ width: `${activeFramework.score}%` }} /></div>
            </div>

            <div className="soc-line-list">
              {auditTrail.map((item) => (
                <div key={item.step} className="soc-line-item">
                  <span>{item.step}</span>
                  <span className="soc-line-meta mono">{item.time} • {item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="panel soc-stack-panel">
        <div className="soc-section-head">
          <div>
            <h2>Control register</h2>
            <p>Evidence-backed controls and owner assignments.</p>
          </div>
        </div>

        <div className="soc-table-shell" style={{ marginTop: '12px' }}>
          <table className="soc-data-table">
            <thead>
              <tr>
                <th>Control</th>
                <th>Framework</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {controlRows.map((row) => (
                <tr key={row.control}>
                  <td>{row.control}</td>
                  <td>{row.framework}</td>
                  <td><span className={`soc-pill ${row.status === 'Pass' ? 'good' : 'warn'}`}>{row.status}</span></td>
                  <td>{row.owner}</td>
                  <td className="soc-line-meta">{row.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CompliancePage;
