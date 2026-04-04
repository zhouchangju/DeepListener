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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  UNLEARNT: { label: "未学习", color: "text-slate-600", bg: "bg-slate-50" },
  INTENSIVE: { label: "精听", color: "text-indigo-700", bg: "bg-indigo-50" },
  ANALYSIS: { label: "分析", color: "text-amber-700", bg: "bg-amber-50" },
  SHADOWING: { label: "Shadowing", color: "text-purple-700", bg: "bg-purple-50" },
  SPEED_SHADOWING: { label: "倍速 Shadowing", color: "text-pink-700", bg: "bg-pink-50" },
  PARAPHRASE: { label: "Paraphrase", color: "text-cyan-700", bg: "bg-cyan-50" },
  LEARNT: { label: "已学习", color: "text-green-700", bg: "bg-green-50" },
};

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
        await fetch(`/api/track/${track.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: value }),
        });
        toast.success(`Status updated to ${STATUS_CONFIG[value]?.label || value}`);
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
        await fetch(`/api/track/${track.id}`, { 
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: !track.isArchived }),
        });
        toast.success(track.isArchived ? "Restored!" : "Archived!");
        router.refresh();
      } catch {
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
      } catch {
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
        {tracks.map((track) => {
          const statusConfig = STATUS_CONFIG[track.status] || STATUS_CONFIG["INTENSIVE"];
          const isSelected = selectedTrackIds.has(track.id);

          const cardContent = (
            <Card className={`hover:shadow-md transition-shadow relative group ${
              track.status === "LEARNT" ? "bg-green-50/30" : "hover:bg-slate-50"
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
                      : "bg-white border-gray-300 hover:border-indigo-400"
                  }`}>
                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                  </div>
                </div>
              )}

              <CardHeader className={`pr-12 ${selectionMode ? "pl-12" : ""}`}>
                  <div className="flex flex-wrap gap-2 mb-2">
                     <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${statusConfig.bg} ${statusConfig.color} border-transparent`}>
                        {statusConfig.label}
                     </span>
                    {track.trackType && track.trackType !== "Other" && (
                       <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full font-medium border border-indigo-100">
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
                          className="h-8 w-8 text-gray-400 hover:text-indigo-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          disabled={loadingId === track.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <DropdownMenuItem 
                            key={key} 
                            onClick={(e) => handleAction(e, "change-status", track, key)}
                            className={track.status === key ? "bg-accent" : ""}
                          >
                             <div className={`w-2 h-2 rounded-full mr-2 ${config.color.replace('text-', 'bg-')}`} />
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
