'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProgramDistribution } from '@/types';

const COLORS = ['#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#1e40af','#1e3a8a'];

export default function ProgramDistributionChart({ data }: { data: ProgramDistribution[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="study_program"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}
