import React from 'react';
import { motion } from 'framer-motion';
import { useThreatEngine } from '../../hooks/useThreatEngine';

const AXES = [
  'reconnaissance',
  'initial_access',
  'execution',
  'persistence',
  'command_and_control',
  'exfiltration'
];

const ThreatRadar = () => {
  const { aiStats } = useThreatEngine();
  const data = aiStats?.intentBreakdown || {};

  const size = 300;
  const center = size / 2;
  const radius = size * 0.35;

  const maxVal = Math.max(...Object.values(data), 10);
  
  const getCoordinates = (val, i) => {
    const ratio = val / maxVal;
    const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    const x = center + radius * ratio * Math.cos(angle);
    const y = center + radius * ratio * Math.sin(angle);
    return [x, y];
  };

  const points = AXES.map((axis, i) => getCoordinates(data[axis] || 0, i));
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`).join(' ') + ' Z';

  return (
    <div style={{
      background: 'white',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      borderRadius: '24px',
      padding: '24px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: '900', color: '#1e293b' }}>📡 THREAT INTENT RADAR</h3>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Grid Circles */}
          {[0.25, 0.5, 0.75, 1].map(scale => (
            <circle
              key={scale}
              cx={center}
              cy={center}
              r={radius * scale}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="1"
            />
          ))}

          {/* Axis Lines */}
          {AXES.map((_, i) => {
            const [x, y] = getCoordinates(maxVal, i);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            );
          })}

          {/* Labels */}
          {AXES.map((axis, i) => {
            const [x, y] = getCoordinates(maxVal * 1.25, i);
            return (
              <text
                key={i}
                x={x}
                y={y}
                fill="#94a3b8"
                fontSize="8"
                fontWeight="800"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ textTransform: 'uppercase' }}
              >
                {axis.replace(/_/g, ' ')}
              </text>
            );
          })}

          {/* Data Polygon */}
          <motion.path
            d={pathData}
            fill="rgba(37, 99, 235, 0.1)"
            stroke="#2563eb"
            strokeWidth="2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            style={{ transformOrigin: `${center}px ${center}px` }}
          />

          {/* Intersection Points */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p[0]}
              cy={p[1]}
              r="4"
              fill="#2563eb"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

export { ThreatRadar };
