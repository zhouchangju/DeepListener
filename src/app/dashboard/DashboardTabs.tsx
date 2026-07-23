"use client";

import { useState } from "react";
import { OverviewSection } from "./sections/OverviewSection";
import { MemorySection } from "./sections/MemorySection";
import { WorkloadSection } from "./sections/WorkloadSection";
import { BehaviorSection } from "./sections/BehaviorSection";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Brain, Activity, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardData } from "./types";

interface DashboardTabsProps {
  data: DashboardData;
}

export function DashboardTabs({ data }: DashboardTabsProps) {
  const t = useTranslations("dashboard");
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: t("overview"), icon: LayoutDashboard },
    { id: "memory", label: t("memory"), icon: Brain },
    { id: "workload", label: t("workload"), icon: Activity },
    { id: "behavior", label: t("behavior"), icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-px" role="tablist" aria-label={t("tabAria")}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <tab.icon className="w-4 h-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="mt-6"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "overview" && (
          <OverviewSection
            countdownDays={data.countdownDays}
            reached={data.reached}
            targetDateLabel={data.targetDateLabel}
            learntCount={data.learntCount}
            progressPercent={data.progressPercent}
            totalHours={data.totalHours}
            c1Progress={data.c1Progress}
            totalTracks={data.totalTracks}
            totalSentences={data.totalSentences}
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
