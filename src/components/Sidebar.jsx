import { Link, useLocation } from 'react-router-dom';
import { Shield, Activity, Database, Settings, Menu } from 'lucide-react';
import './Sidebar.css';
import { useState } from 'react';

const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <Activity size={20} /> },
    { name: 'Threat Logs', path: '/logs', icon: <Database size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> }
  ];

  return (
    <>
      <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
        <Menu />
      </button>
      <aside className={`sidebar glass-panel ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <Shield className="logo-icon" size={32} />
          <h1 className="logo-text text-gradient">CyberGraph</h1>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator">
            <span className="dot pulse"></span>
            System Online
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
