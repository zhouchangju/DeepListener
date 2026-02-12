"use client";

import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

interface DifficultySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const DIFFICULTIES = [
  { value: "NORMAL", label: "Normal", color: "text-slate-500", iconColor: "text-slate-400", borderColor: "border-slate-400", ringColor: "ring-slate-200" },
  { value: "HARD", label: "Hard", color: "text-orange-500", iconColor: "text-orange-500", borderColor: "border-orange-500", ringColor: "ring-orange-200" },
  { value: "VERY_HARD", label: "Very Hard", color: "text-red-600", iconColor: "text-red-600", borderColor: "border-red-600", ringColor: "ring-red-200" },
] as const;

export default function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <div className="flex gap-2">
      {DIFFICULTIES.map((diff) => (
        <Button
          key={diff.value}
          variant="outline"
          size="sm"
          className={`gap-1.5 ${value === diff.value ? `${diff.borderColor} bg-slate-50 ring-1 ${diff.ringColor}` : ""}`}
          onClick={() => onChange(diff.value)}
        >
          <Flame className={`h-3.5 w-3.5 ${diff.value === "NORMAL" ? "opacity-0" : diff.iconColor}`} />
          <span className={value === diff.value ? diff.color : "text-slate-500"}>{diff.label}</span>
        </Button>
      ))}
    </div>
  );
}
