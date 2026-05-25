import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import VaultPageClient from "./VaultPageClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

interface VaultPageTrack {
  id: string;
  title: string;
  audioUrl: string;
}

interface VaultPageItem {
  id: string;
  userNote: string | null;
  difficulty: string | null;
  isArchived: boolean;
  due: Date | null;
  nextReview: Date | null;
  stability: number | null;
  dr: number | null;
  retrieval: number | null;
  lapse: number | null;
  createdAt: Date;
  tags: { id: string; name: string }[];
  sentence: {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    formatting: string | null;
    track: VaultPageTrack;
  };
}

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
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [items, dueCount, totalCount] = await Promise.all([
    prisma.reviewItem.findMany({
      select: {
        id: true,
        userNote: true,
        difficulty: true,
        isArchived: true,
        due: true,
        nextReview: true,
        stability: true,
        dr: true,
        retrieval: true,
        lapse: true,
        createdAt: true,
        tags: {
          select: { id: true, name: true }
        },
        sentence: {
          select: {
            id: true,
            text: true,
            startTime: true,
            endTime: true,
            formatting: true,
            track: {
              select: {
                id: true,
                title: true,
                audioUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reviewItem.count({
      where: {
        due: { lte: endOfToday },
        isArchived: false,
      },
    }),
    prisma.reviewItem.count()
  ]);

  const typedItems: VaultPageItem[] = items;

  const uniqueTracks: VaultPageTrack[] = [...new Map(
    typedItems
      .filter(i => !i.isArchived)
      .map(i => [i.sentence.track.id, i.sentence.track])
  ).values()];

  return (
    <VaultPageClient
      items={typedItems}
      availableTracks={uniqueTracks}
      dueCount={dueCount}
      totalCount={totalCount}
    />
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
