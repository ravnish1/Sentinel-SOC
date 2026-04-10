import React from 'react';
import { useThreatEngine } from '../hooks/useThreatEngine';
import IndiaMap from './IndiaMap';
import SparklineChart from './SparklineChart';
import LogsTable from './LogsTable';
import GraphVisualizer from './GraphVisualizer';
import SummaryCards from './SummaryCards';
import './Dashboard.css';

const Dashboard = () => {
  const { stats, logs, arcs, volumeData, graphData } = useThreatEngine();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header animate-fade-in">
        <h2 className="text-gradient terminal-cursor">Sentinel Cyber Intelligence Platform</h2>
        <p className="text-secondary font-mono">LIVE FEED // UPLINK SECURE</p>
      </header>

      <div className="stats-row animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <SummaryCards stats={stats} />
      </div>

      <div className="dashboard-main-grid">
        <section className="globe-section glass-panel animate-fade-in" style={{ animationDelay: '0.2s', position: 'relative' }}>
           {/* Crosshair decoration */}
          <div className="crosshair top-left"></div>
          <div className="crosshair top-right"></div>
          <div className="crosshair bottom-left"></div>
          <div className="crosshair bottom-right"></div>
          
          <div className="section-header absolute-header">
            <h3>Geospatial Threat Map</h3>
          </div>
          <div className="globe-wrapper">
            <IndiaMap />
          </div>
        </section>

        <div className="right-column">
          <section className="logs-section glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="section-header">
              <h3>Live Activity Feed</h3>
            </div>
            <div className="logs-wrapper">
              <LogsTable logs={logs} />
            </div>
          </section>

          <section className="metrics-section glass-panel animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="section-header">
              <h3>Attack Volume</h3>
            </div>
            <div className="sparkline-wrapper">
              <SparklineChart data={volumeData} />
            </div>
          </section>
          
          <section className="graph-section glass-panel animate-fade-in" style={{ animationDelay: '0.5s' }}>
             <div className="section-header">
              <h3>Entity Correlation</h3>
            </div>
            <div className="graph-wrapper" style={{ height: '300px' }}>
               <GraphVisualizer data={graphData} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
