"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, RotateCcw, MoreVertical, Trash2, Edit3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RenameTrackModal from "@/components/feature/RenameTrackModal";

interface Track {
  id: string;
  title: string;
  isArchived: boolean;
  createdAt: Date;
  _count: { sentences: number };
}

export default function TrackList({ tracks }: { tracks: Track[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [renamingTrack, setRenamingTrack] = useState<Track | null>(null);

  const handleAction = async (e: React.MouseEvent, action: "archive" | "delete" | "rename", track: Track) => {
    e.preventDefault();
    e.stopPropagation();

    if (loadingId) return;

    if (action === "rename") {
      setRenamingTrack(track);
      return;
    }

    if (action === "archive") {
      setLoadingId(track.id);
      try {
        await fetch(`/api/track/${track.id}`, { // Updated endpoint
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: !track.isArchived }),
        });
        toast.success(track.isArchived ? "Restored!" : "Archived!");
        router.refresh();
      } catch (error) {
        toast.error("Operation failed");
      } finally {
        setLoadingId(null);
      }
    } else if (action === "delete") {
      if (!confirm("⚠️ PERMANENT DELETE WARNING ⚠️\n\nThis will remove the audio file and ALL your notes/reviews for this track.\nThis action CANNOT be undone.\n\nAre you sure?")) return;
      
      setLoadingId(track.id);
      try {
        const res = await fetch(`/api/track/${track.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.success("Track deleted permanently");
        router.refresh();
      } catch (error) {
        toast.error("Delete failed");
      } finally {
        setLoadingId(null);
      }
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl text-gray-400">
        No tracks found.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks.map((track) => (
          <Link key={track.id} href={`/practice/${track.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer relative group">
              <CardHeader className="pr-12">
                <CardTitle className="leading-tight break-words text-lg">
                  {track.title}
                </CardTitle>
                
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-400 hover:text-indigo-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        disabled={loadingId === track.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleAction(e, "rename", track)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleAction(e, "archive", track)}>
                        {track.isArchived ? (
                          <><RotateCcw className="mr-2 h-4 w-4" /> Restore</>
                        ) : (
                          <><Archive className="mr-2 h-4 w-4" /> Archive</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleAction(e, "delete", track)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardDescription className="mt-2">
                  <span suppressHydrationWarning>
                    {track._count.sentences} sentences • {new Date(track.createdAt).toLocaleDateString()}
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {renamingTrack && (
        <RenameTrackModal 
          isOpen={!!renamingTrack} 
          onClose={() => setRenamingTrack(null)} 
          track={renamingTrack}
          onRenamed={() => router.refresh()}
        />
      )}
    </>
  );
}
