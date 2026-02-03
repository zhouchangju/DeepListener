"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold } from "lucide-react";
import { toast } from "sonner";

interface ReviewNoteEditorProps {
  initialNote?: string | null;
  reviewItemId: string;
  onNoteChange?: (note: string) => void;
}

export default function ReviewNoteEditor({ initialNote, reviewItemId, onNoteChange }: ReviewNoteEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(initialNote || "");

  // Update content when initialNote changes
  useEffect(() => {
    // Update the ref value
    lastSavedContentRef.current = initialNote || "";

    // Set content after a delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = initialNote || "";
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [reviewItemId, initialNote]);

  const handleInput = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, 1000); // 1 second debounce for review notes
  };

  const saveNote = async () => {
    if (!editorRef.current) return;
    const currentContent = editorRef.current.innerHTML;

    // Check against ref to avoid unnecessary saves
    if (currentContent === lastSavedContentRef.current) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/vault/${reviewItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNote: currentContent }),
      });

      if (!res.ok) throw new Error("Failed to save");

      lastSavedContentRef.current = currentContent;
      onNoteChange?.(currentContent);
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const exec = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput(); // Trigger save on format change
  };

  return (
    <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b p-2 flex gap-2 items-center flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase mr-2 select-none">
          Note
        </span>

        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => exec("bold")}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </Button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <div className="flex gap-1 items-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => exec("fontSize", "3")}
            className="h-7 text-xs font-normal px-2"
            title="Normal Size"
          >
            Aa
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => exec("fontSize", "5")}
            className="h-7 text-base font-bold px-2"
            title="Large Size"
          >
            Aa
          </Button>
        </div>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {/* Color buttons */}
        <div className="flex gap-1 items-center">
          {[
            { c: "#000000", label: "Black" },
            { c: "#EF4444", label: "Red" },
            { c: "#3B82F6", label: "Blue" },
            { c: "#10B981", label: "Green" },
            { c: "#F59E0B", label: "Amber" },
            { c: "#8B5CF6", label: "Purple" }
          ].map(({ c, label }) => (
            <button
              key={c}
              className="w-4 h-4 rounded-full border border-gray-200 hover:scale-110 transition-transform shadow-sm"
              style={{ backgroundColor: c }}
              onClick={() => exec("foreColor", c)}
              title={label}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          {isSaving ? (
            <span className="animate-pulse">Saving...</span>
          ) : (
            <span>Saved</span>
          )}
        </div>
      </div>

      {/* Editor */}
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
