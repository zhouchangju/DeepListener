import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import VaultListClient from "./VaultListClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Clock } from "lucide-react";
import ExportButtons from "./ExportButtons";

export default function VaultPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Sentence Vault</h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and manage your captured sentences
          </p>
        </div>
        <Link href="/review">
          <Badge className="px-4 py-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700">
            Start SRS Review
          </Badge>
        </Link>
      </div>

      <Suspense fallback={<VaultListSkeleton />}>
        <VaultContent />
      </Suspense>
    </div>
  );
}

async function VaultContent() {
  const items = await prisma.reviewItem.findMany({
    take: 100, // Limit to 100 recent items for performance. TODO: Add pagination.
    include: {
      sentence: {
        include: { track: true },
      },
      tags: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const dueCount = await prisma.reviewItem.count({
    where: {
      nextReview: {
        lte: new Date(),
      },
    },
  });

  const totalCount = await prisma.reviewItem.count();

  return (
    <>
      <ExportButtons itemCount={items.length} dueCount={dueCount} />
      <VaultListClient initialItems={items} totalCount={totalCount} />
    </>
  );
}

function VaultListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col gap-2 p-4 border rounded-xl">
          <div className="flex justify-between">
             <Skeleton className="h-6 w-32" />
             <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
