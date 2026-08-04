"use client";

import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { RadarDatum } from "./types";
import { getChartPalette } from "./chart-theme";
import { localDateKey } from "@/lib/local-day";

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

export function ContentMasteryRadar({ data }: { data: RadarDatum[] }) {
  const palette = getChartPalette();
  return (
    <ChartWrapper fallbackHeight={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke={palette.grid} />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: palette.axis }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Mastery"
          dataKey="A"
          stroke={palette.primary}
          fill={palette.primary}
          fillOpacity={0.5}
        />
        <Tooltip />
      </RadarChart>
    </ChartWrapper>
  );
}

export function StudyHeatmap({ data }: { data: Record<string, number> }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) return <div className="h-44 bg-muted animate-pulse rounded-lg" />;

  // 1. Calculate Stats
  const dateKeys = Object.keys(data).sort();
  const activeDays = dateKeys.filter(k => data[k] > 0).length;
  
  // Streak calculation
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  
  // Current Streak (starting from today or yesterday)
  const checkDate = new Date();
  for (let i = 0; i < 365; i++) {
    // Use local-day keys so the heatmap data (keyed by localDateKey) matches
    // regardless of timezone. Previously toISOString() used UTC dates and
    // mismatched the local-day keys for non-UTC users.
    const dStr = localDateKey(checkDate);
    if (data[dStr] > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If today is 0, check yesterday. If yesterday is also 0, streak is 0.
      if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  // Max Streak
  const allDatesInRange = [];
  const d = new Date();
  for(let i=0; i<365; i++) {
    allDatesInRange.push(localDateKey(d));
    d.setDate(d.getDate() - 1);
  }
  allDatesInRange.reverse().forEach(date => {
    if (data[date] > 0) {
      tempStreak++;
      maxStreak = Math.max(maxStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  });

  // 2. Generate Grid (12 months / 53 weeks)
  const weeksToShow = 52;
  const daysToShow = weeksToShow * 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysToShow);
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() - 1);
  }

  const weeks = [];
  const current = new Date(startDate);
  while (current <= today || weeks.length <= weeksToShow) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const dateKey = localDateKey(current);
      week.push({
        date: dateKey,
        value: data[dateKey] || 0,
        isFuture: current > today
      });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  const getIntensity = (val: number) => {
    if (val === 0) return 'bg-muted';
    if (val < 900) return 'bg-primary/25';
    if (val < 1800) return 'bg-primary/50';
    if (val < 3600) return 'bg-primary/75';
    return 'bg-primary';
  };

  const dayLabels = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
      {/* Main Heatmap Container */}
      <div className="flex-1 w-full overflow-hidden">
        <div className="flex items-start gap-2 overflow-x-auto pb-4 no-scrollbar">
          <div className="flex flex-col gap-1 mt-6 sticky left-0 bg-card pr-2 z-10">
            {dayLabels.map((label, i) => (
              <div key={i} className="h-3 text-[10px] text-muted-foreground flex items-center leading-none uppercase font-semibold">
                {label}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                <div className="h-4 text-[10px] text-muted-foreground mb-1">
                  {(weekIndex % 4 === 0 || (weekIndex > 0 && new Date(week[0].date).getDate() <= 7)) &&
                    new Date(week[0].date).toLocaleDateString('en-US', { month: 'short' })}
                </div>
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${Math.round(day.value / 60)}m`}
                    className={`w-3 h-3 rounded-[2px] ${day.isFuture ? 'opacity-0' : getIntensity(day.value)} transition-colors duration-200 hover:ring-2 hover:ring-primary/40 cursor-pointer`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-start gap-1 items-center text-[10px] text-muted-foreground mt-2">
          <span>Less</span>
          {[0, 900, 1800, 3600, 5000].map((v, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-[1px] ${getIntensity(v)}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Achievement Sidebar */}
      <div className="flex flex-row lg:flex-col gap-6 lg:border-l lg:border-border lg:pl-8 py-2 min-w-max">
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Days</div>
          <div className="text-2xl font-black text-foreground">{activeDays}</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] text-primary uppercase font-bold tracking-wider flex items-center gap-1">
             Current Streak 🔥
          </div>
          <div className="text-2xl font-black text-primary">{currentStreak} <span className="text-sm font-normal text-muted-foreground">days</span></div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] text-amber-500 dark:text-amber-400 uppercase font-bold tracking-wider">Best Streak</div>
          <div className="text-2xl font-black text-foreground">{maxStreak}</div>
        </div>
      </div>
    </div>
  );
}
