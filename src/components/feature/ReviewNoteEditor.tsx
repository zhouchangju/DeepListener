"use client";

import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { requireOkResponse } from "@/lib/client-response";
import { RichTextToolbar } from "./rich-text/RichTextToolbar";
import { useAutosavedRichTextNote } from "./rich-text/useAutosavedRichTextNote";

interface ReviewNoteEditorProps {
  initialNote?: string | null;
  reviewItemId: string;
  onNoteChange?: (note: string) => void;
}

export default function ReviewNoteEditor({ initialNote, reviewItemId, onNoteChange }: ReviewNoteEditorProps) {
  const t = useTranslations("feature.richText");
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

      await requireOkResponse(res, t("saveNoteFailed"));
    },
    onSaved: onNoteChange,
    onError: (error) => toast.error(error instanceof Error ? error.message : t("saveNoteFailed")),
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      toast.success(t("copiedToast"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    <div className="border border-border rounded-lg shadow-sm bg-card overflow-hidden">
      <RichTextToolbar
        label="Note"
        isSaving={isSaving}
        showSavingStatus
        onCommand={exec}
        onCopy={handleCopy}
      />

      <div
        ref={editorRef}
        className="p-3 outline-none prose prose-sm max-w-none min-h-[100px] text-foreground"
        contentEditable
        onInput={handleInput}
        onBlur={saveNote}
        suppressContentEditableWarning
      />
    </div>
  );
}
