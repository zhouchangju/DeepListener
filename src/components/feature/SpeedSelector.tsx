"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Gauge } from "lucide-react";

interface SpeedSelectorProps {
  playbackRate: number;
  onRateChange: (rate: number) => void;
  variant?: "default" | "minimal";
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function SpeedSelector({ 
  playbackRate, 
  onRateChange,
  variant = "default" 
}: SpeedSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "minimal" ? "ghost" : "outline"}
          size="sm"
          className={`gap-2 ${variant === "minimal" ? "h-8 px-2" : "h-9"}`}
        >
          <Gauge className="h-4 w-4" />
          <span className="w-8 text-center">{playbackRate}x</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[4rem]">
        {SPEEDS.map((speed) => (
          <DropdownMenuItem
            key={speed}
            onClick={() => onRateChange(speed)}
            className={`justify-center cursor-pointer ${
              playbackRate === speed ? "bg-accent font-bold" : ""
            }`}
          >
            {speed}x
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
