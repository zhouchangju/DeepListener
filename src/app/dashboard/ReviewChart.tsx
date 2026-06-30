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

interface ReviewChartDatum {
  date: string;
  fullDate: string;
  past: number;
  future: number;
}

interface ReviewTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ReviewChartDatum }>;
}

function ReviewTooltip({ active, payload }: ReviewTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-popover text-popover-foreground p-3 border border-border rounded-lg shadow-md">
      <p className="text-sm font-semibold text-foreground">{data.fullDate}</p>
      <p className="text-sm text-indigo-600">Reviewed: {data.past}</p>
      <p className="text-sm text-emerald-600">Due: {data.future}</p>
    </div>
  );
}

export function ReviewChart({ pastData, futureData }: ReviewChartProps) {
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

  return (
    <ChartWrapper fallbackHeight={350}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        barGap={0}
      >
        <XAxis
          dataKey="date"
          height={50}
          interval={0}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip content={<ReviewTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Legend verticalAlign="top" height={36}/>
        <ReferenceLine x={pastData.length - 0.5} stroke="#cbd5e1" strokeDasharray="3 3" />
        <Bar dataKey="past" name="Completed Reviews" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
        <Bar dataKey="future" name="Scheduled Reviews" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
      </BarChart>
    </ChartWrapper>
  );
}
