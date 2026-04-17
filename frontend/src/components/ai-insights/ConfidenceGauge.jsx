import React from 'react';
import { motion } from 'framer-motion';

const ConfidenceGauge = ({ score = 0, size = 120 }) => {
  const radius = size * 0.4;
  const stroke = size * 0.08;
  const normalizedScore = Math.min(100, Math.max(0, score));
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return '#dc2626'; // Red-600
    if (s >= 60) return '#ea580c'; // Orange-600
    if (s >= 40) return '#ca8a04'; // Yellow-600
    return '#16a34a'; // Green-600
  };

  const getLabel = (s) => {
    if (s >= 80) return 'CONFIRMED';
    if (s >= 60) return 'LIKELY';
    if (s >= 40) return 'POSSIBLE';
    return 'UNLIKELY';
  };

  const color = getColor(normalizedScore);

  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background Circle */}
        <circle
          stroke="rgba(0, 0, 0, 0.05)"
          strokeWidth={stroke}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Circle */}
        <motion.circle
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      
      {/* Content */}
      <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ 
          fontSize: size * 0.22, 
          fontWeight: '900', 
          color: color, 
          lineHeight: 1,
          fontFamily: 'monospace' 
        }}>
          {Math.round(normalizedScore)}%
        </span>
        <span style={{ 
          fontSize: size * 0.08, 
          fontWeight: '800', 
          color: 'rgba(0,0,0,0.5)', 
          marginTop: 2,
          letterSpacing: '0.05em'
        }}>
          {getLabel(normalizedScore)}
        </span>
      </div>
    </div>
  );
};

export { ConfidenceGauge };
