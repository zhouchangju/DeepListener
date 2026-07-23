"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, BarChart3, Activity, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { StabilityDistributionChart, RetentionTrendChart } from "../MemoryCharts";
import { LeechItem, NamedValueDatum, RetentionDatum } from "../types";

interface MemorySectionProps {
  stabilityData: NamedValueDatum[];
  retentionData: RetentionDatum[];
  leeches: LeechItem[];
}

export function MemorySection({ stabilityData, retentionData, leeches }: MemorySectionProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
        <Brain className="w-6 h-6 text-primary" /> {t("memoryHealth")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> {t("stabilityDist")}
            </CardTitle>
            <CardDescription>{t("stabilityDistDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <StabilityDistributionChart data={stabilityData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" /> {t("trueRetention")}
            </CardTitle>
            <CardDescription>{t("trueRetentionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionTrendChart data={retentionData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-4 h-4" /> {t("leechAlert")}
            </CardTitle>
            <CardDescription>{t("leechDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leeches.length > 0 ? (
              leeches.map((l) => (
                <div key={l.id} className="text-xs p-2 bg-rose-50 border border-rose-100 rounded text-rose-700 truncate dark:bg-rose-500/15 dark:border-rose-400/25 dark:text-rose-200">
                  {l.sentence.text}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-10">{t("noLeeches")}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
