'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { ProgramDistribution } from '@/types';

const COLORS = [
  '#1d4ed8','#2563eb','#3b82f6','#0891b2','#0d9488','#059669',
  '#7c3aed','#9333ea','#db2777','#dc2626','#d97706','#65a30d',
];

export default function ProgramDistributionChart({ data }: { data: ProgramDistribution[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Belum ada data</div>;
  }

  // Sort descending, ambil top 10, sisanya gabung ke "Lainnya"
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 10);
  const rest = sorted.slice(10);
  if (rest.length > 0) {
    top.push({ study_program: 'Lainnya', count: rest.reduce((s, r) => s + r.count, 0) });
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-2 shadow text-xs">
          <p className="font-semibold text-gray-800">{payload[0].payload.study_program}</p>
          <p className="text-blue-600">{payload[0].value} alumni</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={top} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="study_program"
          tick={{ fontSize: 10 }}
          width={180}
          tickFormatter={(v) => v.length > 28 ? v.slice(0, 28) + '…' : v}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}