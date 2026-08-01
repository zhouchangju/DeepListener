"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Archive, RotateCcw, MoreVertical, Trash2, Edit3, BookOpen, Check as CheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RenameTrackModal from "@/components/feature/RenameTrackModal";
import ConfirmDialog from "@/components/feature/ConfirmDialog";
import { requireOkResponse } from "@/lib/client-response";
import { getTrackStatusDisplay, TRACK_STATUS_OPTIONS, type TrackStatus } from "@/lib/domain-constants";

const STATUS_MESSAGE_KEYS: Record<TrackStatus, "unlearnt" | "intensive" | "analysis" | "shadowing" | "speedShadowing" | "paraphrase" | "learnt"> = {
  UNLEARNT: "unlearnt",
  INTENSIVE: "intensive",
  ANALYSIS: "analysis",
  SHADOWING: "shadowing",
  SPEED_SHADOWING: "speedShadowing",
  PARAPHRASE: "paraphrase",
  LEARNT: "learnt",
};

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
  const t = useTranslations("library");
  const statusT = useTranslations("statuses");
  const commonT = useTranslations("common");
  // Track which track ids have an in-flight action so OTHER tracks stay
  // actionable. Previously a single loadingId:string blocked every card while
  // any one card was busy, silently dropping rapid multi-card actions.
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [renamingTrack, setRenamingTrack] = useState<Track | null>(null);
  const [deletingTrack, setDeletingTrack] = useState<Track | null>(null);

  const startLoading = (id: string) =>
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  const stopLoading = (id: string) =>
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const handleAction = async (e: React.MouseEvent, action: "archive" | "delete" | "rename" | "change-status", track: Track, value?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (loadingIds.has(track.id)) return;

    if (action === "rename") {
      setRenamingTrack(track);
      return;
    }

    if (action === "change-status" && value) {
      startLoading(track.id);
      try {
        const res = await fetch(`/api/track/${track.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: value }),
        });
        await requireOkResponse(res, t("operationFailed"));
        toast.success(t("statusUpdated", { status: statusT(STATUS_MESSAGE_KEYS[value as TrackStatus] ?? "intensive") }));
        router.refresh();
      } catch {
        toast.error(t("operationFailed"));
      } finally {
        stopLoading(track.id);
      }
      return;
    }

    if (action === "archive") {
      startLoading(track.id);
      try {
        const res = await fetch(`/api/track/${track.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: !track.isArchived }),
        });
        await requireOkResponse(res, t("operationFailed"));
        toast.success(track.isArchived ? t("restored") : t("archivedToast"));
        router.refresh();
      } catch {
        toast.error(t("operationFailed"));
      } finally {
        stopLoading(track.id);
      }
    } else if (action === "delete") {
      setDeletingTrack(track);
    }
  };

  const confirmDelete = async () => {
    const track = deletingTrack;
    if (!track) return;

    startLoading(track.id);
    try {
      const res = await fetch(`/api/track/${track.id}`, { method: "DELETE" });
      await requireOkResponse(res, t("deleteFailed"));
      toast.success(t("deletedPermanently"));
      router.refresh();
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      stopLoading(track.id);
      setDeletingTrack(null);
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="col-span-full rounded-xl border-2 border-dashed px-6 py-16 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("emptyTitle")}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          {t("emptyBody")}
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/setup">{t("checkSetup")}</Link>
        </Button>
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
            <Card
              className={`hover:-translate-y-0.5 hover:shadow-card-hover transition-[transform,box-shadow] duration-200 ease-out relative group ${
              track.status === "LEARNT" ? "bg-green-50/30 dark:bg-green-500/10" : "hover:bg-slate-50 dark:hover:bg-accent/60"
            } ${selectionMode ? "cursor-default" : "cursor-pointer"} ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
            {...(selectionMode
              ? {}
              : {
                  role: "link",
                  tabIndex: 0,
                  "aria-label": `Open ${track.title}`,
                  onClick: () => router.push(`/practice/${track.id}`),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/practice/${track.id}`);
                    }
                  },
                })}
            >
              {/* Selection Checkbox */}
              {selectionMode && (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Select ${track.title}`}
                  className="absolute top-3 left-3 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleSelection?.(track.id);
                  }}
                >
                  <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "bg-background border-border hover:border-primary/70"
                  }`}>
                    {isSelected && <CheckIcon className="w-4 h-4 text-white" aria-hidden="true" />}
                  </span>
                </button>
              )}

              <CardHeader className={`pr-12 ${selectionMode ? "pl-12" : ""}`}>
                  <div className="flex flex-wrap gap-2 mb-2">
                     <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${statusConfig.bgClass} ${statusConfig.textClass} border-transparent`}>
                        {statusT(STATUS_MESSAGE_KEYS[(track.status as TrackStatus)] ?? "intensive")}
                     </span>
                    {track.trackType && track.trackType !== "Other" && (
                       <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium border border-primary/15 dark:bg-primary/15 dark:border-primary/25 dark:text-primary">
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
                          // Visible on touch (where there is no hover) and on
                          // desktop whenever the card is hovered OR the button
                          // receives keyboard focus. Previously this was
                          // hover-only, which made the rename/archive/delete
                          // menu unreachable via keyboard and invisible on
                          // touch devices — even though README claims full
                          // mobile support.
                          className="h-8 w-8 text-muted-foreground hover:text-primary focus-visible:opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          disabled={loadingIds.has(track.id)}
                          aria-label={t("actionsMenu")}
                        >
                          <MoreVertical className="h-4 w-4" aria-hidden="true" />
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
                             {t("setTo", { status: statusT(STATUS_MESSAGE_KEYS[config.value]) })}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/vault?trackId=${track.id}`);
                          }}
                        >
                          <BookOpen className="mr-2 h-4 w-4" /> {t("viewNotesMenu")}
                        </DropdownMenuItem>
                        <div className="h-px bg-border my-1" />
                        <DropdownMenuItem onClick={(e) => handleAction(e, "rename", track)}>
                          <Edit3 className="mr-2 h-4 w-4" /> {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleAction(e, "archive", track)}>
                          {track.isArchived ? (
                            <><RotateCcw className="mr-2 h-4 w-4" /> {t("restoreAction")}</>
                          ) : (
                            <><Archive className="mr-2 h-4 w-4" /> {t("archiveAction")}</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => handleAction(e, "delete", track)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> {t("deletePermanently")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CardDescription className="mt-2">
                    <span suppressHydrationWarning>
                      {t("sentenceCount", { count: track._count.sentences })} • {new Date(track.createdAt).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>
            );

          return (
            <div key={track.id}>{cardContent}</div>
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

      <ConfirmDialog
        open={!!deletingTrack}
        onOpenChange={(open) => { if (!open) setDeletingTrack(null); }}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={commonT("cancel")}
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
