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

function ChartWrapper({ children, fallbackHeight = 250 }: { children: React.ReactNode; fallbackHeight?: number }) {
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

const STABILITY_COLORS: Record<string, string> = {
  "New": "#94a3b8",
  "Short-term": "#6366f1",
  "Mid-term": "#8b5cf6",
  "Long-term": "#d946ef",
  "Mature": "#16a34a",
};

export function StabilityDistributionChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ChartWrapper>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={STABILITY_COLORS[entry.name] || "#6366f1"} />
          ))}
        </Bar>
      </BarChart>
    </ChartWrapper>
  );
}

export function RetentionTrendChart({ data }: { data: { date: string; retention: number }[] }) {
  return (
    <ChartWrapper>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => [`${value}%`, "Retention"]} />
        <ReferenceLine y={90} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'right', value: '90%', fill: '#10b981', fontSize: 10 }} />
        <Line
          type="monotone"
          dataKey="retention"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartWrapper>
  );
}

export function OverdueBacklogChart({ data }: { data: { name: string; value: number }[] }) {
  const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#10b981"];
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
