import React, { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Cpu, Users, Download, Radar, Play } from 'lucide-react';
import { useThreatEngine } from '../hooks/useThreatEngine';
import IndiaMap from './IndiaMap';
import LogsTable from './LogsTable';
import SparklineChart from './SparklineChart';
import './Dashboard.css';

const statConfig = [
  { key: 'totalThreats', label: 'Total Threats', icon: ShieldAlert, color: 'var(--purple)' },
  { key: 'activeAttacks', label: 'Active Attacks', icon: AlertTriangle, color: 'var(--red)' },
  { key: 'infectedSystems', label: 'Infected Systems', icon: Cpu, color: 'var(--amber)' },
  { key: 'compromisedUsers', label: 'Compromised Users', icon: Users, color: 'var(--accent)' },
];

const threatEntities = [
  { entity: '45.33.22.11', type: 'Attacker IP', status: 'malicious', action: 'SQL Injection → 192.168.1.100' },
  { entity: '185.15.22.1', type: 'Attacker IP', status: 'malicious', action: 'Port Scan → 10.0.0.8' },
  { entity: 'admin', type: 'User Account', status: 'compromised', action: 'Multiple Failed Logins' },
  { entity: 'a1b2c3d4', type: 'Malware Hash', status: 'malicious', action: 'Ransomware Execution' },
  { entity: '192.168.1.100', type: 'Server', status: 'safe', action: 'Target — Patched' },
  { entity: '10.0.0.5', type: 'Database', status: 'safe', action: 'No anomalies' },
];

const Dashboard = () => {
  const { stats, logs, volumeData } = useThreatEngine();

  return (
    <div className="dash">
      <header className="dash-header">
        <div>
          <p className="page-kicker mono">Command Center / Live Overview</p>
          <h2 className="page-title">Threat Overview</h2>
          <p className="page-copy">Real-time telemetry, active incidents, and response-ready intelligence in a compact SOC layout.</p>
        </div>
        <div className="action-group">
          <button type="button" className="ui-button ghost"><Radar size={14} /> Sweep</button>
          <button type="button" className="ui-button ghost"><Download size={14} /> Export</button>
          <button type="button" className="ui-button primary"><Play size={14} /> Trigger Hunt</button>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-row">
        {statConfig.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="stat-card">
            <div className="stat-icon" style={{ background: `${color}15`, color }}>
              <Icon size={18} />
            </div>
            <div>
              <div className="stat-label">{label}</div>
              <div className="stat-value mono">{stats[key]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="dash-grid">
        {/* Map */}
        <div className="card map-container">
          <div className="card-header">Geospatial Threat Map — India</div>
          <div className="map-body">
            <IndiaMap />
          </div>
        </div>

        {/* Right stack */}
        <div className="right-stack">
          {/* Logs */}
          <div className="card">
            <div className="card-header">Live Activity Feed</div>
            <div className="card-body">
              <LogsTable logs={logs} />
            </div>
          </div>

          {/* Sparkline */}
          <div className="card">
            <div className="card-header">Attack Volume</div>
            <div className="chart-body">
              <SparklineChart data={volumeData} />
            </div>
          </div>

          {/* Threat entities — replaces heavy GraphVisualizer */}
          <div className="card">
            <div className="card-header">Threat Entities</div>
            <div className="card-body">
              <table className="threat-table">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {threatEntities.map((t, i) => (
                    <tr key={i}>
                      <td className="entity mono">{t.entity}</td>
                      <td>{t.type}</td>
                      <td><span className={`tag tag-${t.status}`}>{t.status}</span></td>
                      <td style={{ color: 'var(--text-dim)' }}>{t.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
