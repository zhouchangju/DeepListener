"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { InteractiveText } from "@/components/feature/notation/InteractiveText";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { Check, Eye, HelpCircle, Play, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

type ReviewQuality = "again" | "hard" | "good" | "easy";

interface ReviewCardItem {
  userNote?: string | null;
  sentence: {
    text: string;
    formatting?: string | null;
  };
  tags: Array<{ id: string; name: string }>;
}

interface ReviewCardProps {
  current: ReviewCardItem;
  showAnswer: boolean;
  showHelpTooltip: boolean;
  onToggleHelpTooltip: () => void;
  onPlayAudio: () => void;
  onToggleAnswer: () => void;
  onGrade: (quality: ReviewQuality) => void;
}

export function ReviewCard({
  current,
  showAnswer,
  showHelpTooltip,
  onToggleHelpTooltip,
  onPlayAudio,
  onToggleAnswer,
  onGrade,
}: ReviewCardProps) {
  const t = useTranslations("review");
  return (
    <Card className="min-h-[300px] flex flex-col justify-between relative">
      <div className="absolute top-4 right-4 z-10">
        <HelpCircle
          className="h-5 w-5 text-muted-foreground cursor-help hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggleHelpTooltip();
          }}
        />
        <div
          className={`absolute top-6 right-0 w-64 bg-popover text-popover-foreground border border-border text-xs rounded-lg p-3 transition-opacity shadow-lg z-50 ${
            showHelpTooltip ? "opacity-100" : "opacity-0 pointer-events-none"
          } hover:opacity-100 md:group-hover:opacity-100 md:pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="font-semibold mb-2">{t("shortcutGuideTitle")}</div>
          <div className="space-y-1">
            <div>
              • {t.rich("shortcutReplay", { kbd: (chunks) => <kbd className="bg-muted px-1 rounded">{chunks}</kbd> })}
            </div>
            <div>
              • {t.rich("shortcutToggle", { kbd: (chunks) => <kbd className="bg-muted px-1 rounded">{chunks}</kbd> })}
            </div>
            <div>
              • {t.rich("shortcutGrade", { kbd: (chunks) => <kbd className="bg-muted px-1 rounded">{chunks}</kbd> })}
            </div>
          </div>
        </div>
      </div>

      <CardContent className="pt-10 text-center flex-grow">
        <Button variant="secondary" size="lg" className="rounded-full h-16 w-16 mb-4" onClick={onPlayAudio}>
          <Play className="h-8 w-8" />
        </Button>

        {showAnswer && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-center">
              <InteractiveText
                text={current.sentence.text}
                formatting={current.sentence.formatting}
                mode="read"
                className="text-lg font-medium leading-relaxed text-foreground text-center justify-center"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {current.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
            {current.userNote && (
              <div className="text-sm text-foreground bg-muted/60 p-3 rounded border border-border">
                <div className="text-xs font-semibold text-muted-foreground mb-1">{t("noteLabel")}</div>
                <div
                  className="prose prose-sm max-w-none whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(current.userNote) }}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-muted/50 p-6 flex flex-col gap-5">
        <Button className="w-full h-12 text-base" onClick={onToggleAnswer}>
          <Eye className="mr-2 h-5 w-5" /> {showAnswer ? t("hideAnswer") : t("revealAnswer")}
        </Button>

        <div className="grid grid-cols-4 gap-2 w-full">
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive flex-col h-auto py-3"
            onClick={() => onGrade("again")}
          >
            <RotateCcw className="h-4 w-4 mb-1" />
            <span className="text-xs font-medium">{t("again")}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">1</span>
          </Button>
          <Button
            variant="outline"
            className="border-warning/50 text-warning hover:bg-warning/10 hover:text-warning flex-col h-auto py-3"
            onClick={() => onGrade("hard")}
          >
            <TrendingDown className="h-4 w-4 mb-1" />
            <span className="text-xs font-medium">{t("hard")}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">2</span>
          </Button>
          <Button className="bg-success text-success-foreground hover:bg-success/90 flex-col h-auto py-3" onClick={() => onGrade("good")}>
            <Check className="h-4 w-4 mb-1" />
            <span className="text-xs font-medium">{t("good")}</span>
            <span className="text-[10px] opacity-70 tabular-nums">3</span>
          </Button>
          <Button
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary flex-col h-auto py-3"
            onClick={() => onGrade("easy")}
          >
            <TrendingUp className="h-4 w-4 mb-1" />
            <span className="text-xs font-medium">{t("easy")}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">4</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
