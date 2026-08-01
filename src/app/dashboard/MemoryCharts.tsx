"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import { getChartPalette } from "./chart-theme";

function ChartWrapper({ children, fallbackHeight = 250 }: { children: React.ReactNode; fallbackHeight?: number }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <div style={{ width: '100%', height: fallbackHeight }} className="animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <div style={{ width: '100%', height: fallbackHeight }}>
      <ResponsiveContainer width="100%" height={fallbackHeight}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function StabilityDistributionChart({ data }: { data: { name: string; value: number }[] }) {
  const palette = getChartPalette();
  const stabilityColors: Record<string, string> = {
    "New": "#94a3b8",
    "Short-term": palette.primary,
    "Mid-term": palette.purple,
    "Long-term": "#d946ef",
    "Mature": palette.success,
  };
  return (
    <ChartWrapper>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={stabilityColors[entry.name] || palette.primary} />
          ))}
        </Bar>
      </BarChart>
    </ChartWrapper>
  );
}

export function RetentionTrendChart({ data }: { data: { date: string; retention: number | null }[] }) {
  const palette = getChartPalette();
  return (
    <ChartWrapper>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => (value == null ? ["No data", "Retention"] : [`${value}%`, "Retention"])} />
        <ReferenceLine y={90} stroke={palette.success} strokeDasharray="3 3" label={{ position: 'right', value: '90%', fill: palette.success, fontSize: 10 }} />
        <Line
          type="monotone"
          dataKey="retention"
          stroke={palette.primary}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          // Days with no reviews have retention:null; do not connect across
          // them so the gap is visible instead of implying 100%/0%.
          connectNulls={false}
        />
      </LineChart>
    </ChartWrapper>
  );
}

export function OverdueBacklogChart({ data }: { data: { name: string; value: number }[] }) {
  const palette = getChartPalette();
  const COLORS = ["#ef4444", "#f97316", palette.warning, palette.success];
  return (
    <ChartWrapper>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartWrapper>
  );
}
