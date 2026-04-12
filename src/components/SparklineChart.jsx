import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

const SparklineChart = React.memo(({ data }) => (
  <div style={{ width: '100%', height: '100%' }}>
    <ResponsiveContainer>
      <LineChart data={data}>
        <YAxis domain={['dataMin - 5', 'dataMax + 10']} hide />
        <Line
          type="monotone"
          dataKey="volume"
          stroke="#3b82f6"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
));

export default SparklineChart;
