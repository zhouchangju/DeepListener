"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "未学习": "#94a3b8", // Slate
  "精听": "#4f46e5", // Indigo
  "分析": "#d97706", // Amber
  "Shadowing": "#9333ea", // Purple
  "倍速 Shadowing": "#db2777", // Pink
  "Paraphrase": "#0891b2", // Cyan
  "已学习": "#16a34a", // Green
  "Unlearnt": "#94a3b8", // Slate
};

const TAG_COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ec4899", "#6366f1"];

// Client-side only wrapper with delayed rendering to ensure proper layout
function ChartWrapper({ children, fallbackHeight = 250 }: { children: React.ReactNode; fallbackHeight?: number }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Delay rendering to ensure DOM layout is complete
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

export function StatusRingChart({ data }: { data: { name: string; value: number }[] }) {
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
            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartWrapper>
  );
}

export function TypeDistributionChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ChartWrapper fallbackHeight={250}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'transparent' }} />
        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ChartWrapper>
  );
}

export default function ErrorTagChart({ data }: { data: any[] }) {
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
            <Cell key={`cell-${index}`} fill={TAG_COLORS[index % TAG_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartWrapper>
  );
}
