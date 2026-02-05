"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Copy } from "lucide-react";
import { toast } from "sonner";

interface NoteEditorProps {
  initialNote?: string | null;
  trackId: string;
  onSaved?: (content: string) => void;
}

export default function NoteEditor({ initialNote, trackId, onSaved }: NoteEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(initialNote || "");

  useEffect(() => {
    lastSavedContentRef.current = initialNote || "";

    const timer = setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = initialNote || "";
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [trackId, initialNote]);

  const handleInput = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, 1500);
  };

  const saveNote = async () => {
    if (!editorRef.current) return;
    const currentContent = editorRef.current.innerHTML;

    if (currentContent === lastSavedContentRef.current) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/track/${trackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: currentContent }),
      });

      if (!res.ok) throw new Error("Failed to save");

      lastSavedContentRef.current = currentContent;
      onSaved?.(currentContent);
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const exec = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleCopy = async () => {
    if (!editorRef.current) return;

    try {
      const text = editorRef.current.innerText || editorRef.current.textContent || "";
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="mt-8 border rounded-lg shadow-sm bg-white overflow-hidden flex flex-col h-[400px]">
      <div className="bg-slate-50 border-b p-2 flex gap-2 items-center flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase mr-2 select-none">Notes</span>

        <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => exec("bold")}
            title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <div className="flex gap-1 items-center">
            <Button
                size="sm"
                variant="ghost"
                onClick={() => exec("fontSize", "3")}
                className="h-8 text-xs font-normal"
                title="Normal Size"
            >
                Aa
            </Button>
            <Button
                size="sm"
                variant="ghost"
                onClick={() => exec("fontSize", "5")}
                className="h-8 text-lg font-bold"
                title="Large Size"
            >
                Aa
            </Button>
        </div>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <div className="flex gap-1 items-center">
            {[
                { c: "#000000", label: "Black" },
                { c: "#EF4444", label: "Red" },
                { c: "#3B82F6", label: "Blue" },
                { c: "#10B981", label: "Green" },
                { c: "#F59E0B", label: "Amber" },
                { c: "#8B5CF6", label: "Purple" }
            ].map(({c, label}) => (
                <button
                    key={c}
                    className="w-5 h-5 rounded-full border border-gray-200 hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: c }}
                    onClick={() => exec("foreColor", c)}
                    title={label}
                />
            ))}
        </div>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleCopy}
            title="Copy text"
        >
          <Copy className="w-4 h-4" />
        </Button>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            {isSaving ? (
                <span className="animate-pulse">Saving...</span>
            ) : (
                <span>Saved</span>
            )}
        </div>
      </div>

      <div
        ref={editorRef}
        className="flex-1 p-4 outline-none prose prose-sm max-w-none overflow-y-auto"
        contentEditable
        onInput={handleInput}
        onBlur={saveNote}
        suppressContentEditableWarning
      />
    </div>
  );
}
