import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LockKeyhole,
  Settings,
  Shield,
  ShieldCheck,
  Layers3,
  PlugZap,
  ClipboardList,
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, exact: true },
  { label: 'Findings', path: '/findings', icon: ShieldCheck },
  { label: 'Incidents', path: '/incidents', icon: ClipboardList },
  { label: 'Compliance', path: '/compliance', icon: Layers3 },
  { label: 'Vault', path: '/vault', icon: LockKeyhole },
  { label: 'Integrations', path: '/integrations', icon: PlugZap },
  { label: 'Settings', path: '/settings', icon: Settings },
];

const Sidebar = ({ collapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const sidebarClassName = `sidebar ${collapsed ? 'is-collapsed' : ''}`;

  const handleNewTask = () => {
    navigate('/');
    window.setTimeout(() => window.dispatchEvent(new Event('soc:new-task')), 0);
  };

  return (
    <aside className={sidebarClassName}>
      <button
        type="button"
        className="sidebar-new-task"
        onClick={handleNewTask}
      >
        <Shield size={14} />
        <span>New Task</span>
      </button>

      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <Shield size={16} />
        </div>
        <div className="sidebar-brand-copy">
          <h1>Sentinel SOC</h1>
          <p>Ops Console</p>
        </div>

        <button
          type="button"
          className="sidebar-collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ label, path, icon: Icon, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={Boolean(exact)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
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
