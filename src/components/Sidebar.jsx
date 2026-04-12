import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, FileText, Settings } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const { pathname } = useLocation();

  const links = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Threat Logs', path: '/logs', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Shield size={20} />
        <h1>Sentinel SOC</h1>
      </div>

      <nav className="sidebar-nav">
        {links.map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`nav-link ${pathname === path ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="dot" />
        <span>System Online</span>
      </div>
    </aside>
  );
};

export default Sidebar;
