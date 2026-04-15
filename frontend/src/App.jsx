import { Navigate, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FindingsPage from './pages/FindingsPage';
import IncidentsPage from './pages/IncidentsPage';
import CompliancePage from './pages/CompliancePage';
import VaultPage from './pages/VaultPage';
import IntegrationsPage from './pages/IntegrationsPage';
import ThreatLogsPage from './pages/ThreatLogsPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
      />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Navigate to="/findings" replace />} />
          <Route path="/findings" element={<FindingsPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/logs" element={<ThreatLogsPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
