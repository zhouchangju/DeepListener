"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireOkResponse } from "@/lib/client-response";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import DifficultySelector from "./DifficultySelector";
import ReviewNoteEditor from "./ReviewNoteEditor";
import { Copy, Check } from "lucide-react";

const ERROR_TAGS = [
  { id: "Linking", labelKey: "linking" },
  { id: "Vocab", labelKey: "vocab" },
  { id: "Misheard", labelKey: "misheard" },
  { id: "Comprehension", labelKey: "comprehension" },
  { id: "Speed", labelKey: "speed" },
  { id: "Grammar", labelKey: "grammar" },
  { id: "Accent", labelKey: "accent" },
] as const;

interface VaultItem {
  id: string;
  userNote?: string | null;
  hasUserNote?: boolean;
  difficulty?: string | null;
  tags?: { id: string; name: string }[];
  sentence?: {
    text: string;
    track?: { title: string };
  };
}

interface EditVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: VaultItem | null;
  onSaved: (updatedItem?: { userNote?: string; tags?: string[]; difficulty?: string }) => void;
}

export default function EditVaultModal({ isOpen, onClose, item, onSaved }: EditVaultModalProps) {
  const t = useTranslations("feature.editVault");
  const diagT = useTranslations("feature.diagnosis");
  const commonT = useTranslations("common");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("NORMAL");
  const [loading, setLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [loadedNote, setLoadedNote] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (item) {
      setSelectedTags(item.tags?.map((t) => t.name) || []);
      setDifficulty(item.difficulty || "NORMAL");
      setLoadedNote(item.userNote ?? null);
      // Force re-mount editor when item changes
      setEditorKey(prev => prev + 1);
    }
  }, [item, item?.id]);

  useEffect(() => {
    if (!isOpen || !item?.id || item.userNote !== undefined || !item.hasUserNote) return;

    let cancelled = false;
    setNoteLoading(true);
    fetch(`/api/vault/${item.id}`, { headers: { Accept: "application/json" } })
      .then(async (res) => {
        await requireOkResponse(res, t("loadNoteFailed"));
        return await res.json() as { userNote?: string | null };
      })
      .then((data) => {
        if (!cancelled) {
          setLoadedNote(data.userNote ?? null);
          setEditorKey(prev => prev + 1);
        }
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : t("loadNoteFailed"));
      })
      .finally(() => {
        if (!cancelled) setNoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, item, t]);

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("copiedToast"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!item) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vault/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: selectedTags, difficulty }),
      });

      await requireOkResponse(res, t("updateFailed"));

      toast.success(t("saved"));
      onSaved({ tags: selectedTags, difficulty });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto custom-scrollbar" closeLabel={commonT("close")}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="grid gap-4 py-4">
            {/* Original Text Section */}
            <div className="bg-muted/60 border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("originalText")}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleCopyText(item.sentence?.text || "")}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      {t("copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      {t("copy")}
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {item.sentence?.text}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                {t("from", { title: item.sentence?.track?.title || t("unknownTrack") })}
              </div>
            </div>

            <div className="text-sm font-medium">{t("whyDifficult")}</div>
            <div className="flex flex-wrap gap-2">
              {ERROR_TAGS.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag.id)}
                >
                  {diagT(`tags.${tag.labelKey}` as Parameters<typeof diagT>[0])}
                </Badge>
              ))}
            </div>

            <div>
              <div className="text-xs font-medium mb-2 text-muted-foreground">{diagT("difficultyRating")}</div>
              <DifficultySelector value={difficulty} onChange={setDifficulty} />
            </div>

            <div className="text-sm font-medium mt-2">{t("personalNote")}</div>
            {noteLoading ? (
              <div className="rounded-lg border border-border bg-muted/60 p-3 text-sm text-muted-foreground">
                {t("loadingNote")}
              </div>
            ) : (
              <ReviewNoteEditor
                key={editorKey}
                initialNote={loadedNote}
                reviewItemId={item.id}
              />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{commonT("cancel")}</Button>
          <Button onClick={handleSave} disabled={loading || !item}>
            {loading ? t("saving") : t("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
