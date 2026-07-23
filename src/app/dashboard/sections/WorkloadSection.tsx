"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import { ReviewChart } from "../ReviewChart";
import { OverdueBacklogChart } from "../MemoryCharts";
import { NamedValueDatum, ReviewCountDatum } from "../types";

interface WorkloadSectionProps {
  pastData: ReviewCountDatum[];
  futureData: ReviewCountDatum[];
  overdueData: NamedValueDatum[];
}

export function WorkloadSection({ pastData, futureData, overdueData }: WorkloadSectionProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
        <Activity className="w-6 h-6 text-emerald-500" /> {t("reviewWorkload")}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{t("reviewForecast")}</span>
              <div className="flex items-center gap-4 text-sm font-normal">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded"></div>
                  <span className="text-muted-foreground">{t("completed")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                  <span className="text-muted-foreground">{t("scheduled")}</span>
                </div>
              </div>
            </CardTitle>
            <CardDescription>{t("forecastDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewChart pastData={pastData} futureData={futureData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("overdueBacklog")}</CardTitle>
            <CardDescription>{t("overdueDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <OverdueBacklogChart data={overdueData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
