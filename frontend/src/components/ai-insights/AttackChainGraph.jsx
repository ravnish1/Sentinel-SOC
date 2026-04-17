import React from 'react';
import { motion } from 'framer-motion';
import { useThreatEngine } from '../../hooks/useThreatEngine';

const CHAIN_STEPS = [
  { id: 'reconnaissance', label: 'Reconnaissance', icon: '🔍', color: '#2563eb' },
  { id: 'weaponization', label: 'Weaponization', icon: '⚙️', color: '#4f46e5' },
  { id: 'delivery', label: 'Delivery', icon: '📧', color: '#7c3aed' },
  { id: 'exploitation', label: 'Exploitation', icon: '💥', color: '#9333ea' },
  { id: 'installation', label: 'Installation', icon: '📦', color: '#c026d3' },
  { id: 'c2', label: 'Command & Control', icon: '📡', color: '#db2777' },
  { id: 'actions', label: 'Actions on Objectives', icon: '🎯', color: '#dc2626' }
];

const AttackChainGraph = () => {
  const { logs } = useThreatEngine();

  const counts = CHAIN_STEPS.reduce((acc, step) => {
    acc[step.id] = logs.filter(l => {
      const ai = l.aiInsights || (l.raw && l.raw.raw_json && l.raw.raw_json.ai_insights);
      return ai && String(ai.kill_chain_phase).toLowerCase().includes(step.id);
    }).length;
    return acc;
  }, {});

  return (
    <div style={{
      background: 'white',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      borderRadius: '24px',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
      <h3 style={{ margin: '0 0 24px 0', fontSize: '1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
        ⛓️ MITRE KILL CHAIN DISTRIBUTION
      </h3>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        position: 'relative',
        padding: '0 10px'
      }}>
        <div style={{ 
          position: 'absolute', 
          top: '28px', 
          left: '40px', 
          right: '40px', 
          height: '2px', 
          background: '#f1f5f9',
          zIndex: 0
        }} />

        {CHAIN_STEPS.map((step, idx) => {
          const count = counts[step.id] || 0;
          const isActive = count > 0;
          
          return (
            <div key={step.id} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '12px',
              zIndex: 1,
              width: '14%'
            }}>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: isActive ? `${step.color}10` : '#f8fafc',
                  border: `2px solid ${isActive ? step.color : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  position: 'relative',
                  boxShadow: isActive ? `0 4px 12px ${step.color}22` : 'none'
                }}
              >
                {step.icon}
                
                {count > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '-10px',
                      background: step.color,
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid white'
                    }}
                  >
                    {count}
                  </motion.div>
                )}
              </motion.div>
              
              <div style={{ 
                fontSize: '0.65rem', 
                color: isActive ? '#1e293b' : '#94a3b8', 
                textAlign: 'center',
                fontWeight: isActive ? '800' : '500',
                lineHeight: '1.2',
                textTransform: 'uppercase',
                letterSpacing: '0.02em'
              }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { AttackChainGraph };
