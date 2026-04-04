import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { ReviewChart } from "../ReviewChart";
import { OverdueBacklogChart } from "../MemoryCharts";
import { NamedValueDatum, ReviewCountDatum } from "../types";

interface WorkloadSectionProps {
  pastData: ReviewCountDatum[];
  futureData: ReviewCountDatum[];
  overdueData: NamedValueDatum[];
}

export function WorkloadSection({ pastData, futureData, overdueData }: WorkloadSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
        <Activity className="w-6 h-6 text-emerald-500" /> Review Workload
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Review Forecast</span>
              <div className="flex items-center gap-4 text-sm font-normal">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded"></div>
                  <span className="text-gray-600">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                  <span className="text-gray-600">Scheduled</span>
                </div>
              </div>
            </CardTitle>
            <CardDescription>History and upcoming review tasks (Last 7 days & Next 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewChart pastData={pastData} futureData={futureData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overdue Backlog</CardTitle>
            <CardDescription>Detailed delay analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <OverdueBacklogChart data={overdueData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
