"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { StudyHeatmap, ContentMasteryRadar } from "../BehaviorCharts";
import ErrorTagChart from "../StatsCharts";
import { NamedValueDatum, RadarDatum } from "../types";

interface BehaviorSectionProps {
  heatmapData: Record<string, number>;
  radarData: RadarDatum[];
  tagData: NamedValueDatum[];
}

export function BehaviorSection({ heatmapData, radarData, tagData }: BehaviorSectionProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
        <Trophy className="w-6 h-6 text-amber-500" /> {t("behaviorTitle")}
      </h2>

      {/* Heatmap takes a full row */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("heatmapTitle")}</CardTitle>
          <CardDescription>{t("heatmapDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <StudyHeatmap data={heatmapData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("radarTitle")}</CardTitle>
            <CardDescription>{t("radarDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentMasteryRadar data={radarData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("errorAttribution")}</CardTitle>
            <CardDescription>{t("errorAttributionDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {tagData.length > 0 ? (
              <ErrorTagChart data={tagData} />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {t("noErrorTags")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
