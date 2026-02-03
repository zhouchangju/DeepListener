"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

// Client-side only wrapper with delayed rendering
function ChartWrapper({ children, fallbackHeight = 350 }: { children: React.ReactNode; fallbackHeight?: number }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <div style={{ width: '100%', height: fallbackHeight }} className="animate-pulse bg-slate-50 rounded-lg" />;
  }

  return (
    <div style={{ width: '100%', height: fallbackHeight }}>
      <ResponsiveContainer width="100%" height={fallbackHeight}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

interface ReviewChartProps {
  pastData: { date: string; count: number }[];
  futureData: { date: string; count: number }[];
}

export function ReviewChart({ pastData, futureData }: ReviewChartProps) {
  // Combine data and mark each entry as past or future
  const combinedData = [
    ...pastData.map(d => ({ ...d, type: 'past' })),
    ...futureData.map(d => ({ ...d, type: 'future' })),
  ];

  // Get unique dates sorted chronologically
  const allDates = Array.from(
    new Set([...pastData.map(d => d.date), ...futureData.map(d => d.date)])
  ).sort();

  // Format dates for display (MM-DD)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };

  // Transform data for chart
  const chartData = allDates.map(date => {
    const pastEntry = pastData.find(d => d.date === date);
    const futureEntry = futureData.find(d => d.date === date);

    return {
      date: formatDate(date),
      fullDate: date,
      past: pastEntry?.count || 0,
      future: futureEntry?.count || 0,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="text-sm font-semibold text-gray-700">{data.fullDate}</p>
          <p className="text-sm text-indigo-600">Reviewed: {data.past}</p>
          <p className="text-sm text-emerald-600">Due: {data.future}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartWrapper fallbackHeight={350}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <XAxis
          dataKey="date"
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          tick={{ fontSize: 11 }}
        />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <ReferenceLine x={pastData.length - 0.5} stroke="#94a3b8" strokeDasharray="3 3" />
        <Bar dataKey="past" name="Completed Reviews" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="future" name="Scheduled Reviews" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartWrapper>
  );
}
