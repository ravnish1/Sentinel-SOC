import { ShieldAlert, AlertTriangle, Cpu, Users } from 'lucide-react';
import './SummaryCards.css';

const SummaryCards = ({ stats }) => {
  const cards = [
    { title: 'Total Threats', value: stats.totalThreats, icon: <ShieldAlert size={24} />, color: 'var(--accent-purple)' },
    { title: 'Active Attacks', value: stats.activeAttacks, icon: <AlertTriangle size={24} />, color: 'var(--status-critical)' },
    { title: 'Infected Systems', value: stats.infectedSystems, icon: <Cpu size={24} />, color: 'var(--status-warning)' },
    { title: 'Compromised Users', value: stats.compromisedUsers, icon: <Users size={24} />, color: 'var(--accent-cyan)' }
  ];

  return (
    <div className="summary-grid">
      {cards.map((card, index) => (
        <div key={index} className="glass-panel summary-card animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
          <div className="card-icon" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
            {card.icon}
          </div>
          <div className="card-info">
            <h3 className="card-title">{card.title}</h3>
            <p className="card-value">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
