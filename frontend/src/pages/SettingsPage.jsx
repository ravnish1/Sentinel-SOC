import React, { useMemo, useState } from 'react';
import { Copy, ShieldAlert, RotateCcw, Save, SlidersHorizontal } from 'lucide-react';
import './SettingsPage.css';

const STORAGE_KEY = 'soc.settings.v1';

function createDemoApiKey() {
  return `soc_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 8)}`;
}

const presets = [
  {
    id: 'balanced',
    name: 'Balanced',
    score: 82,
    description: 'Good for mixed workloads with automated triage and analyst review.',
    tags: ['Auto-block critical', 'MFA enforced', 'Slack + email'],
  },
  {
    id: 'hardened',
    name: 'Hardened',
    score: 91,
    description: 'Production-grade posture for regulated environments and high-risk assets.',
    tags: ['Aggressive containment', 'Short retention', 'EDR sync'],
  },
  {
    id: 'hunt',
    name: 'Hunt Mode',
    score: 74,
    description: 'Optimized for detection experiments and deep forensic visibility.',
    tags: ['Verbose telemetry', 'Long retention', 'Extended audit'],
  },
];

const integrations = [
  { name: 'Splunk SIEM', status: 'Connected', lastSync: '14s ago', tone: 'good' },
  { name: 'Slack alerts', status: 'Connected', lastSync: '1m ago', tone: 'good' },
  { name: 'CrowdStrike EDR', status: 'Attention', lastSync: '6m ago', tone: 'warn' },
  { name: 'Cloudflare WAF', status: 'Synced', lastSync: '24s ago', tone: 'good' },
];

const initialSwitches = {
  autoContain: true,
  sandboxAttachments: true,
  geoFenceSessions: false,
  darkWebMonitoring: true,
  requireMfa: true,
  verboseAuditing: false,
};

function getDefaultSettings() {
  return {
    selectedPreset: 'hardened',
    retentionDays: 30,
    switches: initialSwitches,
    alertRoute: 'slack',
    emailDistribution: 'soc@sentinel.example',
    slackChannel: '#threat-response',
    webhookEndpoint: 'https://hooks.example.com/soc',
    analystNotes: 'Default hardened policy for production traffic.',
    apiKey: createDemoApiKey(),
  };
}

function getInitialSettings() {
  const defaults = getDefaultSettings();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      switches: {
        ...initialSwitches,
        ...(parsed.switches || {}),
      },
    };
  } catch {
    return defaults;
  }
}

function saveSettings(snapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

const SettingsPage = () => {
  const initial = useMemo(() => getInitialSettings(), []);
  const [selectedPreset, setSelectedPreset] = useState(initial.selectedPreset);
  const [retentionDays, setRetentionDays] = useState(initial.retentionDays);
  const [switches, setSwitches] = useState(initial.switches);
  const [alertRoute, setAlertRoute] = useState(initial.alertRoute);
  const [emailDistribution, setEmailDistribution] = useState(initial.emailDistribution);
  const [slackChannel, setSlackChannel] = useState(initial.slackChannel);
  const [webhookEndpoint, setWebhookEndpoint] = useState(initial.webhookEndpoint);
  const [analystNotes, setAnalystNotes] = useState(initial.analystNotes);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [banner, setBanner] = useState('');

  const activePreset = presets.find((preset) => preset.id === selectedPreset) || presets[0];

  const controlsEnabled = useMemo(
    () => Object.values(switches).filter(Boolean).length,
    [switches]
  );

  const toggleSwitch = (key) => {
    setSwitches((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleSave = () => {
    saveSettings({
      selectedPreset,
      retentionDays,
      switches,
      alertRoute,
      emailDistribution,
      slackChannel,
      webhookEndpoint,
      analystNotes,
      apiKey,
    });
    setBanner(`Saved ${activePreset.name} profile with ${retentionDays}-day retention and ${alertRoute.toUpperCase()} routing.`);
    window.setTimeout(() => setBanner(''), 2800);
  };

  const handleReset = () => {
    const defaults = getDefaultSettings();
    setSelectedPreset(defaults.selectedPreset);
    setRetentionDays(defaults.retentionDays);
    setSwitches(defaults.switches);
    setAlertRoute(defaults.alertRoute);
    setEmailDistribution(defaults.emailDistribution);
    setSlackChannel(defaults.slackChannel);
    setWebhookEndpoint(defaults.webhookEndpoint);
    setAnalystNotes(defaults.analystNotes);
    setApiKey(defaults.apiKey);
    saveSettings({
      selectedPreset: defaults.selectedPreset,
      retentionDays: defaults.retentionDays,
      switches: defaults.switches,
      alertRoute: defaults.alertRoute,
      emailDistribution: defaults.emailDistribution,
      slackChannel: defaults.slackChannel,
      webhookEndpoint: defaults.webhookEndpoint,
      analystNotes: defaults.analystNotes,
      apiKey: defaults.apiKey,
    });
    setBanner('Settings restored to the hardened baseline.');
    window.setTimeout(() => setBanner(''), 2800);
  };

  const handleDuplicateProfile = async () => {
    const snapshot = {
      selectedPreset,
      retentionDays,
      switches,
      alertRoute,
      emailDistribution,
      slackChannel,
      webhookEndpoint,
      analystNotes,
    };
    const text = JSON.stringify(snapshot, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setBanner('Profile copied to clipboard as JSON.');
    } catch {
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `profile-${selectedPreset}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBanner('Clipboard unavailable. Profile exported as JSON file.');
    }
    window.setTimeout(() => setBanner(''), 2800);
  };

  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setBanner('API key copied to clipboard.');
    } catch {
      setBanner('Could not copy API key. Clipboard permission denied.');
    }
    window.setTimeout(() => setBanner(''), 2400);
  };

  const handleRotateApiKey = () => {
    const nextKey = createDemoApiKey();
    setApiKey(nextKey);
    saveSettings({
      selectedPreset,
      retentionDays,
      switches,
      alertRoute,
      emailDistribution,
      slackChannel,
      webhookEndpoint,
      analystNotes,
      apiKey: nextKey,
    });
    setBanner('API key rotated successfully.');
    window.setTimeout(() => setBanner(''), 2600);
  };

  const switchItems = [
    { key: 'autoContain', label: 'Auto-contain critical incidents', description: 'Immediately isolate hosts when the confidence score crosses threshold.' },
    { key: 'sandboxAttachments', label: 'Sandbox email attachments', description: 'Detonate suspicious files before delivery to endpoints.' },
    { key: 'geoFenceSessions', label: 'Geo-fence privileged sessions', description: 'Block impossible travel for admin and break-glass accounts.' },
    { key: 'darkWebMonitoring', label: 'Dark web exposure monitoring', description: 'Track credential leaks and compromised identities.' },
    { key: 'requireMfa', label: 'Require MFA for all access', description: 'Enforce step-up auth on sensitive systems and break-glass routes.' },
    { key: 'verboseAuditing', label: 'Verbose audit logging', description: 'Retain extra context for investigations and forensic reconstruction.' },
  ];

  return (
    <div className="page-shell settings-page">
      <section className="page-hero">
        <div>
          <p className="page-kicker mono">Platform / Settings</p>
          <h1 className="page-title">Security Settings</h1>
          <p className="page-copy">Tune detection policy, alert routing, retention, and integrations with the sort of controls an operational SOC console needs.</p>
        </div>
        <div className="action-group">
          <button type="button" className="ui-button ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="ui-button ghost" onClick={handleDuplicateProfile}><Copy size={14} /> Duplicate Profile</button>
          <button type="button" className="ui-button primary" onClick={handleSave}><Save size={14} /> Save Changes</button>
        </div>
      </section>

      {banner ? <div className="status-banner">{banner}</div> : null}

      <section className="settings-summary">
        <article className="panel summary-card summary-score">
          <div className="panel-title">Security posture</div>
          <div className="score-row">
            <div className="score-value mono">{activePreset.score}</div>
            <div>
              <div className="summary-label">Current profile</div>
              <div className="summary-value">{activePreset.name}</div>
            </div>
          </div>
        </article>
        <article className="panel summary-card">
          <div className="panel-title">Enabled controls</div>
          <div className="summary-value mono">{controlsEnabled}</div>
          <p className="summary-note">of {switchItems.length} hardening switches active</p>
        </article>
        <article className="panel summary-card">
          <div className="panel-title">Retention</div>
          <div className="summary-value mono">{retentionDays} days</div>
          <p className="summary-note">logs, auth events, and response artifacts</p>
        </article>
        <article className="panel summary-card">
          <div className="panel-title">Alert route</div>
          <div className="summary-value">{alertRoute.toUpperCase()}</div>
          <p className="summary-note">primary escalation channel</p>
        </article>
      </section>

      <section className="settings-layout">
        <div className="settings-stack">
          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Profile presets</div>
                <div className="panel-subtitle">Pick the operating mode that matches the environment.</div>
              </div>
            </div>
            <div className="panel-body preset-grid">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-card ${selectedPreset === preset.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedPreset(preset.id)}
                >
                  <div className="preset-head">
                    <div>
                      <div className="preset-name">{preset.name}</div>
                      <div className="preset-score mono">{preset.score}</div>
                    </div>
                    <SlidersHorizontal size={16} />
                  </div>
                  <p className="preset-copy">{preset.description}</p>
                  <div className="preset-tags">
                    {preset.tags.map((tag) => (
                      <span key={tag} className="ui-chip">{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Detection policy</div>
                <div className="panel-subtitle">Controls that shape how the SOC reacts.</div>
              </div>
            </div>
            <div className="panel-body switches-grid">
              {switchItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`switch-row ${switches[item.key] ? 'is-on' : ''}`}
                  onClick={() => toggleSwitch(item.key)}
                >
                  <div>
                    <div className="switch-title">{item.label}</div>
                    <div className="switch-copy">{item.description}</div>
                  </div>
                  <span className="toggle-shell" aria-hidden="true">
                    <span className="toggle-thumb" />
                  </span>
                </button>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Alert routing</div>
                <div className="panel-subtitle">Where incidents get sent when they go live.</div>
              </div>
            </div>
            <div className="panel-body routing-grid">
              <label className="field-group">
                <span>Email distribution</span>
                <input className="ui-field" value={emailDistribution} onChange={(event) => setEmailDistribution(event.target.value)} />
              </label>
              <label className="field-group">
                <span>Slack channel</span>
                <input className="ui-field" value={slackChannel} onChange={(event) => setSlackChannel(event.target.value)} />
              </label>
              <label className="field-group">
                <span>Webhook endpoint</span>
                <input className="ui-field" value={webhookEndpoint} onChange={(event) => setWebhookEndpoint(event.target.value)} />
              </label>
              <label className="field-group">
                <span>Primary route</span>
                <select className="ui-select" value={alertRoute} onChange={(event) => setAlertRoute(event.target.value)}>
                  <option value="slack">Slack</option>
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                </select>
              </label>
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Retention and audit</div>
                <div className="panel-subtitle">Compliance settings for logs and investigations.</div>
              </div>
            </div>
            <div className="panel-body retention-grid">
              <label className="field-group range-group">
                <div className="field-row">
                  <span>Retention window</span>
                  <span className="mono">{retentionDays} days</span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="120"
                  value={retentionDays}
                  onChange={(event) => setRetentionDays(Number(event.target.value))}
                />
              </label>
              <label className="field-group">
                <span>Analyst notes</span>
                <textarea className="ui-textarea" rows="4" placeholder="Add change notes, rollout guidance, or compliance exceptions." value={analystNotes} onChange={(event) => setAnalystNotes(event.target.value)}></textarea>
              </label>
            </div>
          </article>
        </div>

        <aside className="settings-stack side-stack">
          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Integration health</div>
                <div className="panel-subtitle">Signals flowing into the platform.</div>
              </div>
            </div>
            <div className="panel-body integration-list">
              {integrations.map((item) => (
                <div key={item.name} className="integration-row">
                  <div>
                    <div className="integration-name">{item.name}</div>
                    <div className="integration-meta">Last sync {item.lastSync}</div>
                  </div>
                  <span className={`integration-pill ${item.tone}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Access and secrets</div>
                <div className="panel-subtitle">Rotate and protect API access.</div>
              </div>
            </div>
            <div className="panel-body secret-card">
              <div className="secret-row">
                <div>
                  <div className="secret-label">API key</div>
                  <div className="secret-value mono">{apiKey.slice(0, 6)}••••••••{apiKey.slice(-4)}</div>
                </div>
                <button type="button" className="ui-button ghost" onClick={handleCopyApiKey}><Copy size={14} /> Copy</button>
              </div>
              <div className="secret-row">
                <div>
                  <div className="secret-label">Rotation policy</div>
                  <div className="secret-value">Every 30 days</div>
                </div>
                <button type="button" className="ui-button ghost" onClick={handleRotateApiKey}><RotateCcw size={14} /> Rotate</button>
              </div>
            </div>
          </article>

          <article className="panel posture-panel">
            <div className="posture-head">
              <ShieldAlert size={18} />
              <span>Change status</span>
            </div>
            <div className="posture-copy">All changes are staged locally in this demo. In a production build, these controls would persist to the policy service and audit trail.</div>
          </article>
        </aside>
      </section>
    </div>
  );
};

export default SettingsPage;