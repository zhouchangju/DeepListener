"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";
import { NamedValueDatum } from "./types";
import { getChartPalette, getStatusColor } from "./chart-theme";
import type { TrackStatus } from "@/lib/domain-constants";

export type StatusDatum = {
  status: TrackStatus;
  name: string;
  value: number;
};

// Client-side only wrapper with delayed rendering to ensure proper layout
function ChartWrapper({ children, fallbackHeight = 250 }: { children: React.ReactNode; fallbackHeight?: number }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Delay rendering to ensure DOM layout is complete
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

export function StatusRingChart({ data }: { data: StatusDatum[] }) {
  const palette = getChartPalette();
  return (
    <ChartWrapper fallbackHeight={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getStatusColor(entry.status, palette)} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartWrapper>
  );
}

export function TypeDistributionChart({ data }: { data: { name: string; value: number }[] }) {
  const palette = getChartPalette();
  return (
    <ChartWrapper fallbackHeight={250}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'transparent' }} />
        <Bar dataKey="value" fill={palette.primary} radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ChartWrapper>
  );
}

export default function ErrorTagChart({ data }: { data: NamedValueDatum[] }) {
  const palette = getChartPalette();
  const tagColors = [palette.danger, palette.warning, palette.success, "#06b6d4", palette.purple, "#ec4899", palette.primary];
  return (
    <ChartWrapper fallbackHeight={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={tagColors[index % tagColors.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartWrapper>
  );
}
