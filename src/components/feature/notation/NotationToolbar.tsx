"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { NotationType } from "./types";
import { cn } from "@/lib/utils";
import { Zap, Link as LinkIcon, TrendingDown, CircleOff, MousePointer2 } from "lucide-react";

interface NotationToolbarProps {
  activeTool: NotationType | null;
  onToolChange: (tool: NotationType | null) => void;
}

export const NotationToolbar = ({ activeTool, onToolChange }: NotationToolbarProps) => {
  const tools: { type: NotationType; label: string; icon: React.ElementType; color: string }[] = [
    { type: "stress", label: "Stress", icon: Zap, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { type: "linking", label: "Linking", icon: LinkIcon, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { type: "reduction", label: "Weak", icon: TrendingDown, color: "text-slate-600 bg-slate-50 border-slate-200" },
    { type: "elision", label: "Elision", icon: CircleOff, color: "text-rose-600 bg-rose-50 border-rose-200" },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-card rounded-full border border-border shadow-sm self-center">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "rounded-full px-3 h-8 text-xs gap-1.5",
          activeTool === null && "bg-muted text-foreground shadow-inner"
        )}
        onClick={() => onToolChange(null)}
      >
        <MousePointer2 className="w-3.5 h-3.5" />
        Select
      </Button>
      
      <div className="w-px h-4 bg-border mx-1" />

      {tools.map((tool) => {
        const isActive = activeTool === tool.type;
        const Icon = tool.icon;
        
        return (
          <Button
            key={tool.type}
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-full px-3 h-8 text-xs gap-1.5 transition-all",
              isActive ? tool.color + " shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onToolChange(tool.type)}
          >
            <Icon className="w-3.5 h-3.5" />
            {tool.label}
          </Button>
        );
      })}
    </div>
  );
};
