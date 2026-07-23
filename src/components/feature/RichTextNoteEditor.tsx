"use client";

import { useTranslations } from "next-intl";
import { RichTextToolbar } from "./rich-text/RichTextToolbar";
import { useRichTextEditor } from "./rich-text/useRichTextEditor";

interface RichTextNoteEditorProps {
  initialNote?: string | null;
  onChange?: (note: string) => void;
  placeholder?: string;
  className?: string;
  /** When this key changes, the editor content is reloaded */
  reloadKey?: unknown;
}

/**
 * Reusable rich text editor component for note-taking.
 * Can be used for both creating new notes and editing existing ones.
 * Does NOT auto-save - parent component controls when to save.
 */
export default function RichTextNoteEditor({
  initialNote = "",
  onChange,
  placeholder,
  className = "",
  reloadKey,
}: RichTextNoteEditorProps) {
  const t = useTranslations("feature.richText");
  const { editorRef, exec, handleInput } = useRichTextEditor({ initialNote, onChange, reloadKey });

  return (
    <div className={`border border-border rounded-lg shadow-sm bg-card overflow-hidden ${className}`}>
      <RichTextToolbar onCommand={exec} />

      <div
        ref={editorRef}
        className="p-3 outline-none prose prose-sm max-w-none min-h-[100px] text-foreground"
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
        data-placeholder={placeholder ?? t("placeholder")}
      />
    </div>
  );
}
