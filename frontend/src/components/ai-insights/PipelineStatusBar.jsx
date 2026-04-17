import React, { useEffect } from 'react';
import { useThreatEngine } from '../../hooks/useThreatEngine';

const PipelineStatusBar = () => {
  const { pipelineStatus, getPipelineStatus } = useThreatEngine();

  useEffect(() => {
    getPipelineStatus();
    const interval = setInterval(getPipelineStatus, 10000);
    return () => clearInterval(interval);
  }, [getPipelineStatus]);

  if (!pipelineStatus) return null;

  const isOnline = pipelineStatus.ai_engine?.ollama_status === 'ONLINE';
  const queueCount = pipelineStatus.pipeline?.queued || 0;

  return (
    <div className="pipeline-status-bar" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      fontSize: '0.65rem',
      color: '#64748b',
      fontWeight: '900',
      letterSpacing: '0.05em',
      background: '#f8fafc',
      padding: '4px 12px',
      borderRadius: '20px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: isOnline ? '#16a34a' : '#dc2626',
          boxShadow: isOnline ? '0 0 10px rgba(22, 163, 74, 0.4)' : '0 0 10px rgba(220, 38, 38, 0.4)'
        }} />
        <span>OLLAMA: {isOnline ? 'ONLINE' : 'OFFLINE'}</span>
      </div>

      <div style={{ opacity: 0.2 }}>|</div>

      <div>MODEL: {pipelineStatus.ai_engine?.model?.toUpperCase()}</div>

      <div style={{ opacity: 0.2 }}>|</div>

      <div style={{ color: queueCount > 0 ? '#2563eb' : 'inherit' }}>
        QUEUE: {queueCount} FILES
      </div>

      <div style={{ opacity: 0.2 }}>|</div>

      <div style={{ color: isOnline ? '#2563eb' : '#ea580c' }}>
        MODE: {isOnline ? 'AI ACTIVE' : 'RULE FALLBACK'}
      </div>
    </div>
  );
};

export { PipelineStatusBar };
