"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRichTextEditor } from "./useRichTextEditor";

interface UseAutosavedRichTextNoteOptions {
  initialNote?: string | null;
  reloadKey: unknown;
  saveDelayMs: number;
  save: (content: string) => Promise<void>;
  onSaved?: (content: string) => void;
  onError?: () => void;
}

export function useAutosavedRichTextNote({
  initialNote = "",
  reloadKey,
  saveDelayMs,
  save,
  onSaved,
  onError,
}: UseAutosavedRichTextNoteOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef(initialNote || "");
  const editor = useRichTextEditor({ initialNote, reloadKey });

  useEffect(() => {
    lastSavedContentRef.current = initialNote || "";
  }, [initialNote, reloadKey]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const saveNote = useCallback(async () => {
    const currentContent = editor.getHtml();
    if (currentContent === lastSavedContentRef.current) return;

    setIsSaving(true);
    try {
      await save(currentContent);
      lastSavedContentRef.current = currentContent;
      onSaved?.(currentContent);
    } catch {
      onError?.();
    } finally {
      setIsSaving(false);
    }
  }, [editor, onError, onSaved, save]);

  const handleInput = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      void saveNote();
    }, saveDelayMs);
  }, [saveDelayMs, saveNote]);

  const exec = useCallback(
    (command: string, value: string = "") => {
      editor.exec(command, value);
      handleInput();
    },
    [editor, handleInput]
  );

  return {
    editorRef: editor.editorRef,
    exec,
    getText: editor.getText,
    handleInput,
    isSaving,
    saveNote,
  };
}
