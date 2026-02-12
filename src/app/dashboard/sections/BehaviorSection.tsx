import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { StudyHeatmap, ContentMasteryRadar } from "../BehaviorCharts";
import ErrorTagChart from "../StatsCharts";

interface BehaviorSectionProps {
  heatmapData: Record<string, number>;
  radarData: any[];
  tagData: any[];
}

export function BehaviorSection({ heatmapData, radarData, tagData }: BehaviorSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
        <Trophy className="w-6 h-6 text-amber-500" /> Behavior & Content
      </h2>

      {/* Heatmap takes a full row */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Study Activity Heatmap</CardTitle>
          <CardDescription>Consistency over the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <StudyHeatmap data={heatmapData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Mastery Radar</CardTitle>
            <CardDescription>Strength by material type</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentMasteryRadar data={radarData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Error Attribution</CardTitle>
            <CardDescription>Analysis of common mistake types</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {tagData.length > 0 ? (
              <ErrorTagChart data={tagData} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No error tags logged yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
