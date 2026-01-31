"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { tokenizeSentence } from "@/lib/text-utils";
import { NotationType, SentenceFormatting } from "./types";

interface InteractiveTextProps {
  text: string;
  formatting?: SentenceFormatting | string | null;
  mode?: "read" | "edit";
  activeTool?: NotationType | null;
  onChange?: (newFormatting: SentenceFormatting) => void;
  className?: string;
}

export const InteractiveText = React.memo(({
  text,
  formatting: rawFormatting,
  mode = "read",
  activeTool,
  onChange,
  className,
}: InteractiveTextProps) => {
  const tokens = tokenizeSentence(text);
  
  const formatting: SentenceFormatting = React.useMemo(() => {
    if (!rawFormatting) return {};
    if (typeof rawFormatting === "string") {
      try {
        return JSON.parse(rawFormatting);
      } catch {
        return {};
      }
    }
    return rawFormatting;
  }, [rawFormatting]);

  const toggleStress = (index: number) => {
    if (mode !== "edit" || activeTool !== "stress") return;
    const current = formatting.stress || [];
    const next = current.includes(index)
      ? current.filter((i) => i !== index)
      : [...current, index];
    onChange?.({ ...formatting, stress: next });
  };

  const toggleReduction = (index: number) => {
    if (mode !== "edit" || activeTool !== "reduction") return;
    const current = formatting.reduction || [];
    const next = current.includes(index)
      ? current.filter((i) => i !== index)
      : [...current, index];
    onChange?.({ ...formatting, reduction: next });
  };

  const toggleElision = (index: number) => {
    if (mode !== "edit" || activeTool !== "elision") return;
    const current = formatting.elision || [];
    const next = current.includes(index)
      ? current.filter((i) => i !== index)
      : [...current, index];
    onChange?.({ ...formatting, elision: next });
  };

  const toggleLinking = (indexA: number, indexB: number) => {
    if (mode !== "edit" || activeTool !== "linking") return;
    const current = formatting.linking || [];
    const isLinked = current.some(([a, b]) => a === indexA && b === indexB);
    const next = isLinked
      ? current.filter(([a, b]) => !(a === indexA && b === indexB))
      : [...current, [indexA, indexB] as [number, number]];
    onChange?.({ ...formatting, linking: next });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-y-4 leading-relaxed select-none", className)}>
      {tokens.map((token, i) => {
        const isStressed = formatting.stress?.includes(i);
        const isReduced = formatting.reduction?.includes(i);
        const isElided = formatting.elision?.includes(i);
        const hasNext = i < tokens.length - 1;
        const isLinkedToNext = formatting.linking?.some(([a, b]) => a === i && b === i + 1);

        return (
          <React.Fragment key={i}>
            {/* Word Token */}
            <span
              onClick={() => {
                if (activeTool === "stress") toggleStress(i);
                if (activeTool === "reduction") toggleReduction(i);
                if (activeTool === "elision") toggleElision(i);
              }}
              className={cn(
                "relative px-1 transition-all duration-200 rounded",
                mode === "edit" && activeTool && activeTool !== "linking" && "hover:bg-slate-100 cursor-pointer",
                isStressed && "font-bold text-indigo-600",
                isReduced && "text-slate-400 scale-90 origin-bottom",
                isElided && "line-through decoration-rose-500 decoration-2 text-slate-300"
              )}
            >
              {/* Stress Mark (Dot above) */}
              {isStressed && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-indigo-500 text-xs">
                  ●
                </span>
              )}
              {token.text}
            </span>

            {/* Gap / Linking Area */}
            {hasNext && (
              <span
                onClick={() => toggleLinking(i, i + 1)}
                className={cn(
                  "relative w-2 h-8 flex items-center justify-center transition-colors",
                  mode === "edit" && activeTool === "linking" && "hover:bg-amber-50 cursor-pointer rounded-sm"
                )}
              >
                {/* Linking Arc (Bottom) */}
                {isLinkedToNext && (
                  <span className="absolute bottom-0 left-[-25%] right-[-25%] h-2 border-b-2 border-amber-400 rounded-[50%] pointer-events-none" />
                )}
                {/* Visual indicator for clickable gap in linking mode */}
                {mode === "edit" && activeTool === "linking" && !isLinkedToNext && (
                   <span className="w-1 h-1 bg-amber-200 rounded-full" />
                )}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
});

InteractiveText.displayName = "InteractiveText";
