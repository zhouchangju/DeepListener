import { Button } from "@/components/ui/button";
import { Mic2, BookmarkCheck, Save, Copy } from "lucide-react";
import { RefObject, memo } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { InteractiveText } from "../notation/InteractiveText";

interface ReviewItem {
  tags?: { name: string }[];
  userNote?: string | null;
  difficulty?: string;
}

interface Sentence {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  formatting?: string | null;
  reviewItem?: ReviewItem | null;
}

interface SentenceListProps {
  sentences: Sentence[];
  activeSentenceIndex: number;
  blindMode: boolean;
  revealedIds: Set<string>;
  debugMode: boolean;
  listContainerRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onSentenceClick: (sentence: Sentence, index: number) => void;
  onShadowing: (index: number) => void;
  onCapture: (sentenceId: string) => void;
}

// Extracted and Memoized Item
const SentenceItem = memo(function SentenceItem({
  s,
  i,
  isActive,
  isBlurred,
  isSaved,
  debugMode,
  labels,
  onClick,
  onShadowing,
  onCapture,
  onCopy,
}: {
  s: Sentence;
  i: number;
  isActive: boolean;
  isBlurred: boolean;
  isSaved: boolean;
  debugMode: boolean;
  labels: {
    shadowing: string;
    copy: string;
    capture: string;
    captured: string;
    copiedToast: string;
    savedShort: string;
    captureShort: string;
  };
  onClick: () => void;
  onShadowing: (e: React.MouseEvent) => void;
  onCapture: (e: React.MouseEvent) => void;
  onCopy: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      id={`sentence-${i}`}
      onClick={onClick}
      className={`group flex flex-col sm:flex-row items-start gap-2 sm:gap-4 p-4 rounded-xl transition-all cursor-pointer border-2 mb-2 ${
        isActive
          ? "bg-primary/10 border-primary/15 shadow-sm dark:bg-primary/10 dark:border-primary/30"
          : isSaved
          ? "bg-amber-50/30 border-amber-100/50 dark:bg-amber-500/10 dark:border-amber-400/25"
          : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-accent/60"
      }`}
    >
      <div
        className={`mt-2.5 w-1.5 h-1.5 rounded-full shrink-0 hidden sm:block ${
          isActive
            ? "bg-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_50%,transparent)]"
            : isSaved
            ? "bg-amber-400"
            : "bg-muted"
        }`}
      />

      <div className="flex-grow w-full">
        <div
          className={`text-[15px] sm:text-[16px] leading-relaxed transition-all duration-300 ${
            isBlurred ? "blur-sm select-none text-muted-foreground/60" : "text-foreground"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-muted-foreground mt-1 shrink-0 bg-muted px-1.5 py-0.5 rounded min-w-[24px] text-center tabular-nums">
              {i + 1}
            </span>
            <div className="flex-grow">
              {debugMode && (
                <span className="text-[10px] text-red-400 font-mono block mb-1">
                  [{s.startTime.toFixed(2)} - {s.endTime.toFixed(2)}]
                </span>
              )}
              <InteractiveText 
                text={s.text} 
                formatting={s.formatting} 
                mode="read" 
                className="text-[15px] sm:text-[16px]"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex sm:hidden items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 gap-1.5 border-border flex-1"
            onClick={onShadowing}
          >
            <Mic2 className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 gap-1.5 border-border flex-1"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`h-9 px-3 gap-1.5 flex-1 ${
              isSaved
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "border-border text-muted-foreground"
            }`}
            onClick={onCapture}
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaved ? labels.savedShort : labels.captureShort}
          </Button>
        </div>
      </div>

      <div className="hidden sm:flex gap-2 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 pt-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 p-0"
          title={labels.shadowing}
          onClick={onShadowing}
        >
          <Mic2 className="h-5 w-5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 p-0"
          title={labels.copy}
          onClick={onCopy}
        >
          <Copy className="h-5 w-5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={`h-9 w-9 p-0 ${
            isSaved
              ? "text-amber-500 hover:text-amber-600"
              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
          }`}
          title={isSaved ? labels.captured : labels.capture}
          onClick={onCapture}
        >
          {isSaved ? (
            <BookmarkCheck className="h-5 w-5" />
          ) : (
            <Save className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
});

export const SentenceList = memo(function SentenceList({
  sentences,
  activeSentenceIndex,
  blindMode,
  revealedIds,
  debugMode,
  listContainerRef,
  onScroll,
  onSentenceClick,
  onShadowing,
  onCapture,
}: SentenceListProps) {
  const t = useTranslations("feature.audioPlayer");

  // Build the localized labels once and reuse across items so the memoized
  // SentenceItem gets a stable object identity for the labels prop and does
  // not need its own useTranslations call (which would break memoization).
  const labels = {
    shadowing: t("sentenceShadowing"),
    copy: t("sentenceCopy"),
    capture: t("sentenceCapture"),
    captured: t("sentenceCaptured"),
    copiedToast: t("copiedToast"),
    savedShort: t("sentenceCaptured"),
    captureShort: t("sentenceCapture"),
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(labels.copiedToast);
  };

  return (
    <div className="bg-card border-t border-border">
      <div
        ref={listContainerRef}
        onScroll={onScroll}
        className="max-h-[450px] overflow-y-auto custom-scrollbar p-2 scroll-smooth"
      >
        {sentences.map((s, i) => {
          const isActive = i === activeSentenceIndex;
          const isBlurred = blindMode && !revealedIds.has(s.id);
          const isSaved = !!s.reviewItem;

          return (
            <SentenceItem
              key={s.id}
              s={s}
              i={i}
              isActive={isActive}
              isBlurred={isBlurred}
              isSaved={isSaved}
              debugMode={debugMode}
              labels={labels}
              onClick={() => onSentenceClick(s, i)}
              onShadowing={(e) => {
                e.stopPropagation();
                onShadowing(i);
              }}
              onCapture={(e) => {
                e.stopPropagation();
                onCapture(s.id);
              }}
              onCopy={(e) => {
                e.stopPropagation();
                handleCopy(s.text);
              }}
            />
          );
        })}
      </div>
    </div>
  );
});
