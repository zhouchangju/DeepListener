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
import DifficultySelector from "./DifficultySelector";
import RichTextNoteEditor from "./RichTextNoteEditor";

const ERROR_TAGS = [
  { id: "Linking", label: "Linking (连读/吞音)" },
  { id: "Vocab", label: "Vocab (生词/短语)" },
  { id: "Misheard", label: "Misheard (听错单词)" },
  { id: "Comprehension", label: "Comprehension (不理解)" },
  { id: "Speed", label: "Speed (语速过快)" },
  { id: "Grammar", label: "Grammar (长难句)" },
  { id: "Accent", label: "Accent (口音)" },
];

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
      <DialogContent className="sm:max-w-[638px]" zIndex="z-[60]">
        <DialogHeader>
          <DialogTitle>Why couldn&apos;t you catch this?</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="p-3 bg-gray-50 rounded-md text-sm italic text-gray-600 border">
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
                {tag.label}
              </Badge>
            ))}
          </div>

          <div>
            <div className="text-xs font-medium mb-2 text-slate-500">Difficulty Rating</div>
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
          </div>

          <RichTextNoteEditor
            initialNote={note}
            onChange={setNote}
            placeholder="Add a note (e.g., 'of' sounded like 'a')"
            reloadKey={isOpen}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={selectedTags.length === 0}>
            Add to Vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
