"use client";

import { Captions } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoSubtitleBarProps {
  visible: boolean;
  subtitle: string | null;
  onVisibleChange: (visible: boolean) => void;
}

export function VideoSubtitleBar({
  visible,
  subtitle,
  onVisibleChange,
}: VideoSubtitleBarProps) {
  return (
    <section className="border-b border-slate-800 bg-slate-950 text-white">
      {visible && (
        <div
          aria-live="off"
          className="flex min-h-16 items-center justify-center bg-black/80 px-6 py-3"
        >
          <p className="line-clamp-2 max-w-4xl text-center text-base font-medium leading-6 text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.95)] sm:text-lg">
            {subtitle ?? "\u00a0"}
          </p>
        </div>
      )}

      <div className="flex justify-end px-3 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={visible}
          className="text-slate-200 hover:bg-slate-800 hover:text-white"
          onClick={() => onVisibleChange(!visible)}
        >
          <Captions aria-hidden="true" />
          {visible ? "Hide subtitles" : "Show subtitles"}
        </Button>
      </div>
    </section>
  );
}

