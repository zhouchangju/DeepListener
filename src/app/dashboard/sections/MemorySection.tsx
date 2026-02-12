import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, BarChart3, Activity, AlertCircle } from "lucide-react";
import { StabilityDistributionChart, RetentionTrendChart } from "../MemoryCharts";

interface MemorySectionProps {
  stabilityData: any[];
  retentionData: any[];
  leeches: any[];
}

export function MemorySection({ stabilityData, retentionData, leeches }: MemorySectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
        <Brain className="w-6 h-6 text-indigo-500" /> Memory Health (FSRS)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Stability Distribution
            </CardTitle>
            <CardDescription>Knowledge base maturity profile</CardDescription>
          </CardHeader>
          <CardContent>
            <StabilityDistributionChart data={stabilityData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" /> True Retention
            </CardTitle>
            <CardDescription>Last 14 days review quality (Target 90%)</CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionTrendChart data={retentionData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-4 h-4" /> Leech Alert
            </CardTitle>
            <CardDescription>Difficult items with high failure rate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leeches.length > 0 ? (
              leeches.map((l: any) => (
                <div key={l.id} className="text-xs p-2 bg-rose-50 border border-rose-100 rounded text-rose-700 truncate">
                  {l.sentence.text}
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-400 text-center py-10">No leeches detected. Great job!</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
