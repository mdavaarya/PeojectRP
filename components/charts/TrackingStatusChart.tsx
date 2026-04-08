'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

interface TrackingStatusData {
  status: string;
  count: number;
  label: string;
  color: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  identified:   { label: 'Teridentifikasi', color: '#10b981' },
  needs_review: { label: 'Perlu Review',    color: '#f59e0b' },
  not_found:    { label: 'Tidak Ditemukan', color: '#6b7280' },
  untracked:    { label: 'Belum Dilacak',   color: '#93c5fd' },
  opted_out:    { label: 'Opt-Out',         color: '#ef4444' },
};

export default function TrackingStatusChart({ data }: { data: Record<string, number> }) {
  const chartData: TrackingStatusData[] = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    status: key,
    count: data[key] || 0,
    label: cfg.label,
    color: cfg.color,
  })).filter(d => d.count > 0);

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Belum ada data tracking</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(val) => [`${val} alumni`, 'Jumlah']} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}