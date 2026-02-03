"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold } from "lucide-react";

interface RichTextNoteEditorProps {
  initialNote?: string | null;
  onChange?: (note: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Reusable rich text editor component for note-taking.
 * Can be used for both creating new notes and editing existing ones.
 * Does NOT auto-save - parent component controls when to save.
 */
export default function RichTextNoteEditor({
  initialNote = "",
  onChange,
  placeholder = "Add a note...",
  className = "",
}: RichTextNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialNote || "");

  // Update content when initialNote changes
  useEffect(() => {
    if (editorRef.current && initialNote !== content) {
      editorRef.current.innerHTML = initialNote || "";
      setContent(initialNote || "");
    }
  }, [initialNote]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const currentContent = editorRef.current.innerHTML;
    setContent(currentContent);
    onChange?.(currentContent);
  };

  const exec = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput(); // Trigger onChange on format change
  };

  return (
    <div className={`border rounded-lg shadow-sm bg-white overflow-hidden ${className}`}>
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
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        className="p-3 outline-none prose prose-sm max-w-none min-h-[100px]"
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
        data-placeholder={placeholder}
      />
    </div>
  );
}
