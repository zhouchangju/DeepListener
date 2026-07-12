"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, RotateCcw, MoreVertical, Trash2, Edit3, BookOpen, Check as CheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RenameTrackModal from "@/components/feature/RenameTrackModal";
import { requireOkResponse } from "@/lib/client-response";
import { getTrackStatusDisplay, TRACK_STATUS_OPTIONS } from "@/lib/domain-constants";

interface Track {
  id: string;
  title: string;
  isArchived: boolean;
  status: string;
  createdAt: Date;
  trackType?: string | null;
  trackTopic?: string | null;
  _count: { sentences: number };
}

interface TrackListProps {
  tracks: Track[];
  selectionMode?: boolean;
  selectedTrackIds?: Set<string>;
  onToggleSelection?: (trackId: string) => void;
}

export default function TrackList({
  tracks,
  selectionMode = false,
  selectedTrackIds = new Set(),
  onToggleSelection,
}: TrackListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [renamingTrack, setRenamingTrack] = useState<Track | null>(null);

  const handleAction = async (e: React.MouseEvent, action: "archive" | "delete" | "rename" | "change-status", track: Track, value?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (loadingId) return;

    if (action === "rename") {
      setRenamingTrack(track);
      return;
    }

    if (action === "change-status" && value) {
      setLoadingId(track.id);
      try {
        const res = await fetch(`/api/track/${track.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: value }),
        });
        await requireOkResponse(res, "Operation failed");
        toast.success(`Status updated to ${getTrackStatusDisplay(value).label}`);
        router.refresh();
      } catch {
        toast.error("Operation failed");
      } finally {
        setLoadingId(null);
      }
      return;
    }

    if (action === "archive") {
      setLoadingId(track.id);
      try {
        const res = await fetch(`/api/track/${track.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: !track.isArchived }),
        });
        await requireOkResponse(res, "Operation failed");
        toast.success(track.isArchived ? "Restored!" : "Archived!");
        router.refresh();
      } catch {
        toast.error("Operation failed");
      } finally {
        setLoadingId(null);
      }
    } else if (action === "delete") {
      if (!confirm("⚠️ PERMANENT DELETE WARNING ⚠️\n\nThis will remove the media files and ALL your notes/reviews for this track.\nThis action CANNOT be undone.\n\nAre you sure?")) return;
      
      setLoadingId(track.id);
      try {
        const res = await fetch(`/api/track/${track.id}`, { method: "DELETE" });
        await requireOkResponse(res, "Delete failed");
        toast.success("Track deleted permanently");
        router.refresh();
      } catch {
        toast.error("Delete failed");
      } finally {
        setLoadingId(null);
      }
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground">
        No tracks found.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks.map((track) => {
          const statusConfig = getTrackStatusDisplay(track.status);
          const isSelected = selectedTrackIds.has(track.id);

          const cardContent = (
            <Card className={`hover:shadow-md transition-shadow relative group ${
              track.status === "LEARNT" ? "bg-green-50/30 dark:bg-green-500/10" : "hover:bg-slate-50 dark:hover:bg-accent/60"
            } ${selectionMode ? "cursor-default" : "cursor-pointer"} ${
              isSelected ? "ring-2 ring-indigo-500" : ""
            }`}>
              {/* Selection Checkbox */}
              {selectionMode && (
                <div
                  className="absolute top-3 left-3 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleSelection?.(track.id);
                  }}
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-indigo-500 border-indigo-500"
                      : "bg-background border-border hover:border-indigo-400"
                  }`}>
                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                  </div>
                </div>
              )}

              <CardHeader className={`pr-12 ${selectionMode ? "pl-12" : ""}`}>
                  <div className="flex flex-wrap gap-2 mb-2">
                     <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${statusConfig.bgClass} ${statusConfig.textClass} border-transparent`}>
                        {statusConfig.label}
                     </span>
                    {track.trackType && track.trackType !== "Other" && (
                       <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full font-medium border border-indigo-100 dark:bg-indigo-500/15 dark:border-indigo-400/25 dark:text-indigo-200">
                          {track.trackType}
                       </span>
                    )}
                  </div>

                  <CardTitle className="leading-tight break-words text-lg">
                    {track.title}
                  </CardTitle>
                  
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-indigo-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          disabled={loadingId === track.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {TRACK_STATUS_OPTIONS.map((config) => (
                          <DropdownMenuItem
                            key={config.value}
                            onClick={(e) => handleAction(e, "change-status", track, config.value)}
                            className={track.status === config.value ? "bg-accent" : ""}
                          >
                             <div className={`w-2 h-2 rounded-full mr-2 ${config.dotClass}`} />
                             Set to {config.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/vault?trackId=${track.id}`);
                          }}
                        >
                          <BookOpen className="mr-2 h-4 w-4" /> View Notes
                        </DropdownMenuItem>
                        <div className="h-px bg-border my-1" />
                        <DropdownMenuItem onClick={(e) => handleAction(e, "rename", track)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
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
            );

          return selectionMode ? (
            <div key={track.id}>{cardContent}</div>
          ) : (
            <Link key={track.id} href={`/practice/${track.id}`}>
              {cardContent}
            </Link>
          );
        })}
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
