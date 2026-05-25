"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDifficultyLabel, getIntervalDescription } from "@/lib/fsrs";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { Archive, ArchiveRestore, ArrowUpDown, BarChart3, Brain, Calendar, Edit3, ExternalLink, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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
  const difficulty = item.difficulty || "NORMAL";
  const [noteHtml, setNoteHtml] = useState(item.userNote ?? null);
  const [isNoteOpen, setIsNoteOpen] = useState(Boolean(item.userNote));
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const hasNote = Boolean(item.hasUserNote || noteHtml);

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
        toast.error("Failed to load note");
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
          >
            <Play className={`h-4 w-4 ${isPlaying ? "animate-pulse" : ""}`} />
          </Button>

          <div className="flex-grow">
            <div className="flex justify-between items-start">
              <p className="text-lg font-medium leading-relaxed text-gray-800">{item.sentence.text}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                  onClick={() => onEdit(item)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-amber-600"
                  onClick={() => onToggleArchive(item.id)}
                  title={item.isArchived ? "Unarchive" : "Archive"}
                >
                  {item.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-red-600"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-3 bg-slate-50 px-2 py-1 rounded text-[10px] text-slate-500 border border-slate-100">
                <div className="flex items-center gap-1" title="Memory Stability">
                  <Brain className="h-3 w-3 text-indigo-400" />
                  <span>
                    S: <span className="font-medium text-slate-700">{getIntervalDescription(item.stability ?? 0)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1" title="Difficulty Rating">
                  <BarChart3 className="h-3 w-3 text-amber-400" />
                  <span>
                    D:{" "}
                    <span className="font-medium text-slate-700">
                      {(item.dr ?? 5).toFixed(1)} ({getDifficultyLabel(item.dr ?? 5)})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1" title="Retrieval / Lapse">
                  <ArrowUpDown className="h-3 w-3 text-emerald-400" />
                  <span>
                    R/L: <span className="font-medium text-slate-700">{item.retrieval ?? 0}/{item.lapse ?? 0}</span>
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

              <span className="text-gray-300">|</span>

              <Link href={`/practice/${item.sentence.track.id}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                {item.sentence.track.title}
              </Link>

              <span className="text-gray-300">|</span>

              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Next: {formatReviewDateLabel(item)}
              </span>

              {hasNote && (
                <>
                  <span className="text-gray-300">|</span>
                  <button
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={handleToggleNote}
                    disabled={isNoteLoading}
                  >
                    {isNoteLoading ? "Loading note..." : isNoteOpen ? "Hide note" : "Show note"}
                  </button>
                </>
              )}
            </div>

            {isNoteOpen && noteHtml && (
              <div className="mt-3 text-sm text-gray-700 bg-white/50 p-3 rounded border-l-2 border-indigo-200 prose prose-sm max-w-none">
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
