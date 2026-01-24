import { prisma } from "@/lib/prisma";
import PracticeClient from "./PracticeClient";
import { notFound } from "next/navigation";

export default async function PracticePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const track = await prisma.track.findUnique({
    where: { id },
    include: {
      sentences: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!track) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 px-4">{track.title}</h1>
      <PracticeClient track={track} />
    </div>
  );
}
