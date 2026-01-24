import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import UploadButton from "./UploadButton";

export default async function LibraryPage() {
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sentences: true } } },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Library</h1>
          <p className="text-gray-500">Upload audio files to start practicing.</p>
        </div>
        <UploadButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks.map((track) => (
          <Link key={track.id} href={`/practice/${track.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="truncate">{track.title}</CardTitle>
                <CardDescription>
                  {track._count.sentences} sentences • {new Date(track.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {tracks.length === 0 && (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl text-gray-400">
            No tracks yet. Click the upload button to get started.
          </div>
        )}
      </div>
    </div>
  );
}
