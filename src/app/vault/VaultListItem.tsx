"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDifficultyLabel, getIntervalDescription } from "@/lib/fsrs";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { Archive, ArchiveRestore, ArrowUpDown, BarChart3, Brain, Calendar, Edit3, ExternalLink, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { formatReviewDateLabel, getDifficultyStyle, type VaultItem, type VaultPlaybackItem } from "./vault-items";

interface VaultListItemProps {
  item: VaultItem;
  isPlaying: boolean;
  onPlay: (item: VaultPlaybackItem) => void;
  onEdit: (item: VaultItem) => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function VaultListItem({ item, isPlaying, onPlay, onEdit, onToggleArchive, onDelete }: VaultListItemProps) {
  const t = useTranslations("vault");
  const difficulty = item.difficulty || "NORMAL";
  const [noteHtml, setNoteHtml] = useState(item.userNote ?? null);
  const [isNoteOpen, setIsNoteOpen] = useState(Boolean(item.userNote));
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const hasNote = Boolean(item.hasUserNote || noteHtml);
  const notePanelId = `vault-note-${item.id}`;

  // Keep the local note in sync with the prop after server refreshes
  // (router.refresh re-renders with a new item but React preserves state, so
  // without this the panel would show stale content until unmount).
  useEffect(() => {
    setNoteHtml(item.userNote ?? null);
  }, [item.userNote]);

  const handleToggleNote = async () => {
    if (isNoteOpen) {
      setIsNoteOpen(false);
      return;
    }

    if (noteHtml === null && item.hasUserNote) {
      setIsNoteLoading(true);
      try {
        setNoteHtml(await loadVaultNote(item.id));
      } catch {
        toast.error(t("loadNoteFailed"));
        return;
      } finally {
        setIsNoteLoading(false);
      }
    }

    setIsNoteOpen(true);
  };

  return (
    <Card className={`group transition-colors ${getDifficultyStyle(difficulty)}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Button
            variant={isPlaying ? "default" : "outline"}
            size="icon"
            className="rounded-full flex-shrink-0"
            onClick={() => onPlay(item)}
            title={isPlaying ? t("pauseSentence") : t("playSentence")}
            aria-label={isPlaying ? t("pauseSentence") : t("playSentence")}
          >
            <Play className={`h-4 w-4 ${isPlaying ? "animate-pulse" : ""}`} />
          </Button>

          <div className="flex-grow">
            <div className="flex justify-between items-start">
              <p className="text-lg font-medium leading-relaxed text-foreground">{item.sentence.text}</p>
              <div className="flex gap-1 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => onEdit(item)}
                  aria-label={t("editAction")}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                  onClick={() => onToggleArchive(item.id)}
                  title={item.isArchived ? t("unarchiveTitle") : t("archiveTitle")}
                  aria-label={item.isArchived ? t("unarchiveTitle") : t("archiveTitle")}
                >
                  {item.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  onClick={() => onDelete(item.id)}
                  aria-label={t("deleteAction")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-3 bg-muted/60 px-2 py-1 rounded text-[10px] text-muted-foreground border border-border">
                <div className="flex items-center gap-1" title={t("stabilityTitle")}>
                  <Brain className="h-3 w-3 text-primary/70" />
                  <span>
                    S: <span className="font-medium text-foreground">{getIntervalDescription(item.stability ?? 0)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1" title={t("difficultyTitle")}>
                  <BarChart3 className="h-3 w-3 text-amber-400" />
                  <span>
                    D:{" "}
                    <span className="font-medium text-foreground">
                      {(item.dr ?? 5).toFixed(1)} ({getDifficultyLabel(item.dr ?? 5)})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1" title={t("retrievalTitle")}>
                  <ArrowUpDown className="h-3 w-3 text-emerald-400" />
                  <span>
                    R/L: <span className="font-medium text-foreground">{item.retrieval ?? 0}/{item.lapse ?? 0}</span>
                  </span>
                </div>
              </div>

              <div className="flex gap-1">
                {item.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-[10px] uppercase tracking-wider">
                    {tag.name}
                  </Badge>
                ))}
              </div>

              <span className="text-muted-foreground/50">|</span>

              <Link href={`/practice/${item.sentence.track.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                {item.sentence.track.title}
              </Link>

              <span className="text-muted-foreground/50">|</span>

              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("nextPrefix")} {formatReviewDateLabel(item)}
              </span>

              {hasNote && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={handleToggleNote}
                    disabled={isNoteLoading}
                    aria-expanded={isNoteOpen}
                    aria-controls={notePanelId}
                  >
                    {isNoteLoading ? t("loadingNote") : isNoteOpen ? t("hideNote") : t("showNote")}
                  </button>
                </>
              )}
            </div>

            {isNoteOpen && noteHtml && (
              <div id={notePanelId} className="mt-3 text-sm text-foreground bg-muted/50 p-3 rounded border-l-2 border-primary/25 prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(noteHtml) }} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

async function loadVaultNote(id: string) {
  const response = await fetch(`/api/vault/${id}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to load note");
  }

  const data = await response.json() as { userNote?: string | null };
  return data.userNote ?? "";
}
