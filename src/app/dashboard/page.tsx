import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCharts from "./StatsCharts";

export default async function DashboardPage() {
  // Get tag counts
  const tags = await prisma.errorTag.findMany({
    include: {
      _count: {
        select: { reviewItems: true },
      },
    },
  });

  const chartData = tags.map((t) => ({
    name: t.name,
    value: t._count.reviewItems,
  }));

  const totalSentences = await prisma.reviewItem.count();

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">
              Sentences in Vault
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalSentences}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Error Attribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.length > 0 ? (
              <StatsCharts data={chartData} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Capture some sentences to see analytics.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
