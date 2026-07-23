"use client";

import { Button } from "@/components/ui/button";
import { Play, RotateCcw, SkipForward, Mic } from "lucide-react";
import { useTranslations } from "next-intl";

interface ShadowingControlsProps {
  mode: string;
  onStartFlow: () => void;
  onRecAgain: () => void;
  onNext: () => void;
}

export default function ShadowingControls({
  mode,
  onStartFlow,
  onRecAgain,
  onNext,
}: ShadowingControlsProps) {
  const t = useTranslations("feature.shadowingConsole");
  const commonT = useTranslations("common");
  return (
    <div className="h-16 flex items-center justify-center w-full relative">
      {mode === "idle" && (
        <Button
          size="lg"
          className="rounded-full px-8 text-lg gap-2 shadow-lg shadow-primary/25 dark:shadow-black/30"
          onClick={onStartFlow}
        >
          <Play className="h-5 w-5" /> {t("startChallenge")}
        </Button>
      )}

      {mode === "playing_original" && (
        <div className="text-primary animate-pulse font-bold text-lg flex items-center gap-2">
          <Play className="h-6 w-6" /> {t("listening")}
        </div>
      )}

      {mode === "reviewing" && (
        <div className="flex gap-4">
          <Button variant="outline" size="lg" onClick={onStartFlow} className="gap-2">
            <RotateCcw className="h-4 w-4" /> {t("fullRetry")}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 gap-2"
            onClick={onRecAgain}
          >
            <Mic className="h-4 w-4" /> {t("recAgain")}
          </Button>
          <Button size="lg" onClick={onNext} className="gap-2">
            {commonT("next")} <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
