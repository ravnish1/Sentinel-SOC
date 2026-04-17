import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Zap, Target, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ConfidenceGauge } from './ConfidenceGauge';

const INTENT_COLORS = {
  reconnaissance: '#2563eb', // Blue-600
  initial_access: '#ea580c', // Orange-600
  execution: '#dc2626',      // Red-600
  persistence: '#9333ea',    // Purple-600
  command_and_control: '#db2777', // Pink-600
  exfiltration: '#b91c1c',   // Red-700
  benign: '#16a34a',         // Green-600
  unknown: '#475569'         // Slate-600
};

const ACTION_THEMES = {
  block_immediately: { color: '#dc2626', icon: ShieldAlert, label: 'BLOCK IMMEDIATELY' },
  investigate: { color: '#ea580c', icon: Zap, label: 'MANUAL INVESTIGATION' },
  monitor: { color: '#2563eb', icon: Target, label: 'ENHANCED MONITORING' },
  escalate_to_tier2: { color: '#7c3aed', icon: AlertTriangle, label: 'ESCALATE TO TIER 2' },
  safe_to_ignore: { color: '#16a34a', icon: ShieldCheck, label: 'KNOWN SAFE' }
};

const AIAnalystCard = ({ threat }) => {
  const ai = threat.ai_insights || (threat.raw_json && threat.raw_json.ai_insights) || threat.aiInsights;
  
  if (!ai) return null;

  const action = ACTION_THEMES[ai.action] || ACTION_THEMES.monitor;
  const ActionIcon = action.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ai-analyst-card"
      style={{
        background: 'white',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '20px',
        padding: '24px',
        color: '#1e293b',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        position: 'relative'
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px', wordBreak: 'break-all', color: '#1e40af' }}>
            {threat.indicator}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
              {String(threat.threat_type || threat.type).toUpperCase()}
            </span>
            <span style={{ 
              background: `${INTENT_COLORS[ai.intent] || '#64748b'}15`, 
              color: INTENT_COLORS[ai.intent] || '#64748b',
              padding: '2px 8px', 
              borderRadius: '4px', 
              fontSize: '0.7rem', 
              fontWeight: 'bold',
              border: `1px solid ${INTENT_COLORS[ai.intent] || '#64748b'}44`
            }}>
              {String(ai.intent || 'UNKNOWN').toUpperCase()}
            </span>
          </div>
        </div>
        <ConfidenceGauge score={ai.confidence_score} size={80} />
      </div>

      {/* AI Summary Box */}
      <div style={{ 
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#0369a1', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.05em' }}>
            🤖 AI ANALYST ASSESSMENT
          </span>
          <span style={{ color: '#64748b', fontSize: '0.65rem', fontFamily: 'monospace' }}>
            {ai.model_used} • {new Date(ai.analyzed_at).toLocaleDateString()}
          </span>
        </div>
        <p style={{ fontSize: '0.9rem', lineHeight: '1.5', margin: 0, color: '#334155', fontWeight: '500' }}>
          {ai.summary}
        </p>
      </div>

      {/* Metadata Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="meta-item">
          <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '4px' }}>Kill Chain Phase</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{ai.kill_chain_phase || 'N/A'}</div>
        </div>
        <div className="meta-item">
          <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '4px' }}>Actor Profile</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{ai.threat_actor_type || 'Unknown'}</div>
        </div>
        <div className="meta-item">
          <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '4px' }}>False Positive Risk</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: ai.false_positive_risk === 'low' ? '#16a34a' : ai.false_positive_risk === 'high' ? '#dc2626' : '#1e293b' }}>
            {String(ai.false_positive_risk || 'Medium').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Action Banner */}
      <div style={{ 
        background: action.color,
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '0 -4px',
        boxShadow: `0 4px 12px ${action.color}44`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ActionIcon size={18} />
          <span style={{ fontWeight: '900', fontSize: '0.85rem' }}>{action.label}</span>
        </div>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.9 }}>
          URGENCY: {String(ai.urgency || 'NORMAL').toUpperCase()}
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
        {(ai.related_cves || []).map(cve => (
          <span key={cve} style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800', border: '1px solid #fecaca' }}>
            {cve}
          </span>
        ))}
        {(ai.tags || []).map(tag => (
          <span key={tag} style={{ background: '#f8fafc', color: '#64748b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid #e2e8f0' }}>
            #{tag}
          </span>
        ))}
      </div>

      {/* Campaign Cluster */}
      {ai.cluster_name && (
        <div style={{ 
          marginTop: '16px', 
          paddingTop: '16px', 
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontSize: '0.75rem', fontWeight: 'bold' }}>
            <Target size={14} />
            🔗 CAMPAIGN CLUSTER: {ai.cluster_name.toUpperCase()}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {ai.campaign}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export { AIAnalystCard };
