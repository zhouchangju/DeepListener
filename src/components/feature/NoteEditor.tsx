"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { requireOkResponse } from "@/lib/client-response";
import { RED_FIRST_RICH_TEXT_COLORS, RichTextToolbar } from "./rich-text/RichTextToolbar";
import { useAutosavedRichTextNote } from "./rich-text/useAutosavedRichTextNote";

interface NoteEditorProps {
  initialNote?: string | null;
  trackId: string;
  onSaved?: (content: string) => void;
}

export default function NoteEditor({ initialNote, trackId, onSaved }: NoteEditorProps) {
  const { editorRef, exec, getText, handleInput, isSaving, saveNote } = useAutosavedRichTextNote({
    initialNote,
    reloadKey: trackId,
    saveDelayMs: 1500,
    save: async (content) => {
      const res = await fetch(`/api/track/${trackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: content }),
      });

      await requireOkResponse(res, "Failed to save note");
    },
    onSaved,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save note"),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1" || e.key === "F2" || e.key === "F3" || e.key === "F4") {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection && selection.toString().trim() !== "") {
          exec("foreColor", RED_FIRST_RICH_TEXT_COLORS[0].c);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [exec]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="mt-8 border border-border rounded-lg shadow-sm bg-card overflow-hidden flex flex-col h-[400px]">
      <RichTextToolbar
        label="Notes"
        variant="comfortable"
        colors={RED_FIRST_RICH_TEXT_COLORS}
        isSaving={isSaving}
        showSavingStatus
        onCommand={exec}
        onCopy={handleCopy}
      />

      <div
        ref={editorRef}
        className="flex-1 p-4 outline-none prose prose-sm max-w-none overflow-y-auto text-foreground"
        contentEditable
        onInput={handleInput}
        onBlur={saveNote}
        suppressContentEditableWarning
      />
    </div>
  );
}
