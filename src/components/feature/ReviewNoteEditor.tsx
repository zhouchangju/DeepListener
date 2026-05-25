"use client";

import { toast } from "sonner";
import { RichTextToolbar } from "./rich-text/RichTextToolbar";
import { useAutosavedRichTextNote } from "./rich-text/useAutosavedRichTextNote";

interface ReviewNoteEditorProps {
  initialNote?: string | null;
  reviewItemId: string;
  onNoteChange?: (note: string) => void;
}

export default function ReviewNoteEditor({ initialNote, reviewItemId, onNoteChange }: ReviewNoteEditorProps) {
  const { editorRef, exec, getText, handleInput, isSaving, saveNote } = useAutosavedRichTextNote({
    initialNote,
    reloadKey: reviewItemId,
    saveDelayMs: 1000,
    save: async (content) => {
      const res = await fetch(`/api/vault/${reviewItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNote: content }),
      });

      if (!res.ok) throw new Error("Failed to save");
    },
    onSaved: onNoteChange,
    onError: () => toast.error("Failed to save note"),
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
      <RichTextToolbar
        label="Note"
        isSaving={isSaving}
        showSavingStatus
        onCommand={exec}
        onCopy={handleCopy}
      />

      <div
        ref={editorRef}
        className="p-3 outline-none prose prose-sm max-w-none min-h-[100px]"
        contentEditable
        onInput={handleInput}
        onBlur={saveNote}
        suppressContentEditableWarning
      />
    </div>
  );
}
