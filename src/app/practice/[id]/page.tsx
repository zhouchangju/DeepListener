import { prisma } from "@/lib/prisma";
import PracticeClient from "./PracticeClient";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PracticePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const track = await prisma.track.findUnique({
    where: { id },
    include: {
      sentences: {
        orderBy: { orderIndex: "asc" },
        include: { 
          reviewItem: {
            include: { tags: true }
          } 
        }, 
      },
    },
  });

  if (!track) {
    notFound();
  }

  return (
    <div className="container mx-auto py-4 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6 px-4">
        <h1 className="text-xl sm:text-2xl font-bold break-words leading-tight">
          {track.title}
        </h1>
        <Link
          href={`/vault?trackId=${id}`}
          className="flex-shrink-0 ml-4 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-colors"
        >
          View Notes
        </Link>
      </div>
      <PracticeClient track={track} />
    </div>
  );
}
