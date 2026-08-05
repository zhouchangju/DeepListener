"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import DifficultySelector from "./DifficultySelector";
import RichTextNoteEditor from "./RichTextNoteEditor";

const ERROR_TAGS = [
  { id: "Linking", labelKey: "linking" },
  { id: "Vocab", labelKey: "vocab" },
  { id: "Misheard", labelKey: "misheard" },
  { id: "Comprehension", labelKey: "comprehension" },
  { id: "Speed", labelKey: "speed" },
  { id: "Grammar", labelKey: "grammar" },
  { id: "Accent", labelKey: "accent" },
] as const;

export function getInitialDiagnosisTags(initialTags: string[], shouldDefaultVocab: boolean) {
  if (initialTags.length > 0) {
    return initialTags;
  }

  return shouldDefaultVocab ? ["Vocab"] : [];
}

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tags: string[], note: string, difficulty: string) => void;
  sentenceText: string;
  initialTags?: string[];
  initialNote?: string;
  initialDifficulty?: string;
  shouldDefaultVocab?: boolean;
}

export default function DiagnosisModal({
  isOpen,
  onClose,
  onSave,
  sentenceText,
  initialTags = [],
  initialNote = "",
  initialDifficulty = "NORMAL",
  shouldDefaultVocab = false,
}: DiagnosisModalProps) {
  const t = useTranslations("feature.diagnosis");
  const commonT = useTranslations("common");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    () => getInitialDiagnosisTags(initialTags, shouldDefaultVocab)
  );
  const [note, setNote] = useState(() => initialNote);
  const [difficulty, setDifficulty] = useState(() => initialDifficulty);

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave(selectedTags, note, difficulty);
    setSelectedTags([]);
    setNote("");
    setDifficulty("NORMAL");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[638px]" closeLabel={commonT("close")} zIndex="z-[60]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="p-3 bg-muted/60 rounded-md text-sm italic text-muted-foreground border border-border">
            &ldquo;{sentenceText}&rdquo;
          </div>
          
          <div className="flex flex-wrap gap-2">
            {ERROR_TAGS.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 text-sm"
                onClick={() => toggleTag(tag.id)}
              >
                {t(`tags.${tag.labelKey}` as Parameters<typeof t>[0])}
              </Badge>
            ))}
          </div>

          <div>
            <div className="text-xs font-medium mb-2 text-muted-foreground">{t("difficultyRating")}</div>
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
          </div>

          <RichTextNoteEditor
            initialNote={note}
            onChange={setNote}
            placeholder={t("notePlaceholder")}
            reloadKey={isOpen}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{commonT("cancel")}</Button>
          <Button onClick={handleSave} disabled={selectedTags.length === 0}>
            {t("addToVault")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
