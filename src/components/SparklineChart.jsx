import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

const SparklineChart = ({ data }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['dataMin - 10', 'dataMax + 20']} hide />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(1, 4, 9, 0.9)', border: '1px solid #06b6d4', color: '#0ef' }}
            itemStyle={{ color: '#06b6d4' }}
            cursor={false}
          />
          <Line 
            type="monotone" 
            dataKey="volume" 
            stroke="#0ef" 
            strokeWidth={2} 
            dot={false}
            isAnimationActive={false} // Disable recharts built-in animation for smoother manual scrolling
            style={{ filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 0.8))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SparklineChart;
