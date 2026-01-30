import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";
import UploadButton from "./UploadButton";
import LibraryManager from "./LibraryManager";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { archived?: string };
}) {
  const { archived } = await searchParams; // Next.js 15 requires awaiting searchParams
  const showArchived = archived === "true";

  const tracks = await prisma.track.findMany({
    where: { isArchived: showArchived },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sentences: true } } },
  });

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
            <div className="flex-1 md:flex-none">
              <UploadButton />
            </div>
          )}
        </div>
      </div>

      <LibraryManager tracks={tracks} />
    </div>
  );
}
