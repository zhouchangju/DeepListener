"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseRichTextEditorOptions {
  initialNote?: string | null;
  onChange?: (note: string) => void;
  reloadKey?: unknown;
}

export function useRichTextEditor({ initialNote = "", onChange, reloadKey }: UseRichTextEditorOptions) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialHtml = initialNote || "";

  useEffect(() => {
    const timer = setTimeout(() => {
      if (editorRef.current && editorRef.current.innerHTML !== initialHtml) {
        editorRef.current.innerHTML = initialHtml;
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [initialHtml, reloadKey]);

  const getHtml = useCallback(() => editorRef.current?.innerHTML || "", []);

  const getText = useCallback(() => {
    if (!editorRef.current) return "";
    return editorRef.current.innerText || editorRef.current.textContent || "";
  }, []);

  const handleInput = useCallback(() => {
    onChange?.(getHtml());
  }, [getHtml, onChange]);

  const exec = useCallback(
    (command: string, value: string = "") => {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      handleInput();
    },
    [handleInput]
  );

  return {
    editorRef,
    exec,
    getHtml,
    getText,
    handleInput,
  };
}
