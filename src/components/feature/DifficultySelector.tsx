"use client";

import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

interface DifficultySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const DIFFICULTIES = [
  { value: "NORMAL", label: "Normal", color: "text-slate-500", iconColor: "text-slate-400" },
  { value: "HARD", label: "Hard", color: "text-orange-500", iconColor: "text-orange-500" },
  { value: "VERY_HARD", label: "Very Hard", color: "text-red-600", iconColor: "text-red-600" },
];

export default function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <div className="flex gap-2">
      {DIFFICULTIES.map((diff) => (
        <Button
          key={diff.value}
          variant="outline"
          size="sm"
          className={`gap-1.5 ${value === diff.value ? `border-${diff.iconColor.split('-')[1]}-500 bg-slate-50 ring-1 ring-${diff.iconColor.split('-')[1]}-200` : ""}`}
          onClick={() => onChange(diff.value)}
        >
          <Flame className={`h-3.5 w-3.5 ${diff.value === "NORMAL" ? "opacity-0" : diff.iconColor}`} />
          <span className={value === diff.value ? diff.color : "text-slate-500"}>{diff.label}</span>
        </Button>
      ))}
    </div>
  );
}
