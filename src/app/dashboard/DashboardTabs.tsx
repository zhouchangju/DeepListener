"use client";

import { useState } from "react";
import { OverviewSection } from "./sections/OverviewSection";
import { MemorySection } from "./sections/MemorySection";
import { WorkloadSection } from "./sections/WorkloadSection";
import { BehaviorSection } from "./sections/BehaviorSection";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Brain, Activity, Trophy } from "lucide-react";

interface DashboardTabsProps {
  data: any; // Simplified for brevity, in real app should be typed
}

export function DashboardTabs({ data }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "memory", label: "Memory", icon: Brain },
    { id: "workload", label: "Workload", icon: Activity },
    { id: "behavior", label: "Behavior", icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "overview" && (
          <OverviewSection
            countdownDays={data.countdownDays}
            learntCount={data.learntCount}
            progressPercent={data.progressPercent}
            totalHours={data.totalHours}
            c1Progress={data.c1Progress}
            statusData={data.statusData}
            typeData={data.typeData}
          />
        )}
        {activeTab === "memory" && (
          <MemorySection
            stabilityData={data.stabilityData}
            retentionData={data.retentionData}
            leeches={data.leeches}
          />
        )}
        {activeTab === "workload" && (
          <WorkloadSection
            pastData={data.pastData}
            futureData={data.futureData}
            overdueData={data.overdueData}
          />
        )}
        {activeTab === "behavior" && (
          <BehaviorSection
            heatmapData={data.heatmapData}
            radarData={data.radarData}
            tagData={data.tagData}
          />
        )}
      </div>
    </div>
  );
}
