import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";
import UploadButton from "./UploadButton";
import BatchUploadButton from "./BatchUploadButton";
import LibraryManager from "./LibraryManager";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { archived?: string; batch?: string };
}) {
  const { archived, batch } = await searchParams;
  const showArchived = archived === "true";
  const showBatchUpload = batch === "true";

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            {showArchived ? "Archived Tracks" : "Your Library"}
            {showArchived && <span className="text-xs md:text-sm font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded">Archive</span>}
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">
            {showArchived ? "Tracks hidden from main view." : "Upload audio files to start practicing."}
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Link href={showArchived ? "/library" : "/library?archived=true"} className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full">
              <Archive className="mr-2 h-4 w-4" />
              {showArchived ? "View Active" : "Archive"}
            </Button>
          </Link>
          {!showArchived && (
            <>
              <Link
                href={showBatchUpload ? "/library" : "/library?batch=true"}
                className="flex-1 md:flex-none"
              >
                <Button variant="outline" className="w-full">
                  {showBatchUpload ? "Single" : "Batch"}
                </Button>
              </Link>
              <div className="flex-1 md:flex-none">
                {showBatchUpload ? <BatchUploadButton /> : <UploadButton />}
              </div>
            </>
          )}
        </div>
      </div>

      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryContent showArchived={showArchived} />
      </Suspense>
    </div>
  );
}

async function LibraryContent({ showArchived }: { showArchived: boolean }) {
  const tracks = await prisma.track.findMany({
    where: { isArchived: showArchived },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      audioUrl: true,
      note: true,
      trackType: true,
      trackTopic: true,
      isArchived: true,
      status: true,
      createdAt: true,
      _count: {
        select: { sentences: true }
      }
    }
  });

  return <LibraryManager tracks={tracks as any} />;
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-40 border rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
