"use client";

import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

interface DifficultySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const DIFFICULTIES = [
  { value: "NORMAL", label: "Normal", color: "text-muted-foreground", iconColor: "text-muted-foreground", borderColor: "border-border", ringColor: "ring-border" },
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
          className={`gap-1.5 ${value === diff.value ? `${diff.borderColor} bg-muted ring-1 ${diff.ringColor}` : ""}`}
          onClick={() => onChange(diff.value)}
        >
          <Flame className={`h-3.5 w-3.5 ${diff.value === "NORMAL" ? "opacity-0" : diff.iconColor}`} />
          <span className={value === diff.value ? diff.color : "text-muted-foreground"}>{diff.label}</span>
        </Button>
      ))}
    </div>
  );
}
