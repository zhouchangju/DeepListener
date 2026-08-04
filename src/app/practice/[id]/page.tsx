import { prisma } from "@/lib/prisma";
import PracticeClient from "./PracticeClient";
import { notFound } from "next/navigation";

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  
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
    <div className="container mx-auto h-full overflow-y-auto p-3 md:overflow-hidden md:p-4">
      <PracticeClient track={track} initialBlindMode={query?.demo === "1"} />
    </div>
  );
}
