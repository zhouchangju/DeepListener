import { Button } from "@/components/ui/button";
import { Mic2, BookmarkCheck, Save } from "lucide-react";
import { RefObject } from "react";

interface Sentence {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  reviewItem?: any;
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

export function SentenceList({
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
  return (
    <div className="bg-white border-t border-slate-100">
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
            <div
              key={s.id}
              id={`sentence-${i}`}
              onClick={() => onSentenceClick(s, i)}
              className={`group flex flex-col sm:flex-row items-start gap-2 sm:gap-4 p-4 rounded-xl transition-all cursor-pointer border-2 mb-2 ${
                isActive
                  ? "bg-indigo-50/50 border-indigo-100 shadow-sm"
                  : isSaved
                  ? "bg-amber-50/30 border-amber-100/50"
                  : "bg-transparent border-transparent hover:bg-slate-50"
              }`}
            >
              {/* Status Dot (PC) */}
              <div
                className={`mt-2.5 w-1.5 h-1.5 rounded-full shrink-0 hidden sm:block ${
                  isActive
                    ? "bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]"
                    : isSaved
                    ? "bg-amber-400"
                    : "bg-slate-200"
                }`}
              />

              {/* Content */}
              <div className="flex-grow w-full">
                <p
                  className={`text-[15px] sm:text-[16px] leading-relaxed transition-all duration-300 ${
                    isBlurred ? "blur-sm select-none text-slate-300" : "text-slate-700"
                  }`}
                >
                  {debugMode && (
                    <span className="text-[10px] text-red-400 font-mono block mb-1">
                      [{s.startTime.toFixed(2)} - {s.endTime.toFixed(2)}]
                    </span>
                  )}
                  {s.text}
                </p>

                {/* Mobile Actions */}
                <div className="mt-3 flex sm:hidden items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full text-[11px] font-bold px-3 gap-1.5 border-slate-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShadowing(i);
                    }}
                  >
                    <Mic2 className="h-3.5 w-3.5 text-indigo-500" /> SHADOWING
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 rounded-full text-[11px] font-bold px-3 gap-1.5 ${
                      isSaved ? "bg-amber-50 text-amber-600 border-amber-200" : "border-slate-200 text-slate-500"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCapture(s.id);
                    }}
                  >
                    {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                    {isSaved ? "SAVED" : "CAPTURE"}
                  </Button>
                </div>
              </div>

              {/* PC Actions */}
              <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-0"
                  title="Shadowing"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShadowing(i);
                  }}
                >
                  <Mic2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-8 w-8 p-0 ${
                    isSaved
                      ? "text-amber-500 hover:text-amber-600"
                      : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  }`}
                  title={isSaved ? "Already Saved" : "Capture to Vault"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCapture(s.id);
                  }}
                >
                  {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
