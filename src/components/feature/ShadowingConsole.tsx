"use client";

import { Button } from "@/components/ui/button";
import { Mic, Play, RotateCcw, SkipForward, X, Loader2, Repeat, Pause, Edit3, Check, Bookmark, BookmarkCheck } from "lucide-react";
import MiniWavePlayer from "./MiniWavePlayer";
import { useShadowingWorkflow } from "./shadowing/useShadowingWorkflow";
import SpeedSelector from "./SpeedSelector";
import { useState, useEffect, useRef } from "react";
import { InteractiveText } from "./notation/InteractiveText";
import { NotationToolbar } from "./notation/NotationToolbar";
import { NotationType, SentenceFormatting } from "./notation/types";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";

interface ShadowingConsoleProps {
  sentence: { id: string; text: string; startTime: number; endTime: number; formatting?: string | null; reviewItem?: any };
  fullAudioBuffer: AudioBuffer;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onCapture: (sentenceId: string) => void;
}

export default function ShadowingConsole({
  sentence,
  fullAudioBuffer,
  currentIndex,
  totalCount,
  onClose,
  onNext,
  onPrev,
  onCapture,
}: ShadowingConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setMode } = useTimeTracking();
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeTool, setActiveTool] = useState<NotationType | null>(null);
  const [localFormatting, setLocalFormatting] = useState<SentenceFormatting>({});
  
  // Text Editing State
  const [isEditingText, setIsEditingText] = useState(false);
  const [tempText, setTempText] = useState(sentence.text);

  const { mode, originalBlob, userBlob, isLooping, startFlow, handleRecAgain, stopAll, toggleLoop } = useShadowingWorkflow({
    sentence,
    fullAudioBuffer,
    playbackRate,
  });

  // Focus on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
    setMode("SHADOWING");
    return () => setMode("LISTENING");
  }, [setMode]);

  // Load formatting when sentence changes
  useEffect(() => {
    if (sentence.formatting) {
      try {
        setLocalFormatting(JSON.parse(sentence.formatting));
      } catch {
        setLocalFormatting({});
      }
    } else {
      setLocalFormatting({});
    }
    setTempText(sentence.text); // Sync temp text
    setIsEditingText(false); // Reset edit mode
  }, [sentence.id, sentence.formatting, sentence.text]);

  // Auto-play original audio after 0.5s when switching to next sentence
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Auto-start playback after 0.5s delay
    const timer = setTimeout(() => {
      startFlow();
    }, 500);

    return () => clearTimeout(timer);
  }, [sentence.id, startFlow]);

  const handleSaveText = async () => {
    try {
      const res = await fetch(`/api/sentence/${sentence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            text: tempText,
            formatting: null // Reset formatting on text change
        }),
      });
      
      if (!res.ok) throw new Error("Failed to update text");
      
      setLocalFormatting({});
      setIsEditingText(false);
      router.refresh();
      toast.success("Text updated");
    } catch (e) {
      toast.error("Failed to save text");
    }
  };

  // Auto-save formatting
  useEffect(() => {
    if (isEditingText) return; // Don't auto-save formatting while editing text

    const timer = setTimeout(async () => {
      const currentJSON = JSON.stringify(localFormatting);
      if (currentJSON === sentence.formatting || (!sentence.formatting && currentJSON === "{}")) return;

      try {
        await fetch(`/api/sentence/${sentence.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formatting: currentJSON }),
        });
      } catch (err) {
        console.error("Auto-save failed", err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [localFormatting, sentence.id, sentence.formatting, isEditingText]);

  const handleNext = () => {
    stopAll();
    if (currentIndex < totalCount - 1) onNext();
  };

  const handlePrev = () => {
    stopAll();
    if (currentIndex > 0) onPrev();
  };

  const handleClose = () => {
    stopAll();
    onClose();
  };

  // Centralized Keyboard Handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditingText) {
        e.stopPropagation(); // Allow typing in textarea
        return; 
    }
    
    e.stopPropagation(); // Stop event from bubbling to background player

    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    } else if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (mode === "idle") {
        startFlow();
      } else {
        stopAll();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4 outline-none"
      tabIndex={-1}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">Shadowing Mode</h2>
            <div className="text-sm font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600">
              {currentIndex + 1} / {totalCount}
            </div>
            <SpeedSelector playbackRate={playbackRate} onRateChange={setPlaybackRate} variant="minimal" />
            <Button
              variant="ghost"
              size="icon"
              className={sentence.reviewItem ? "text-amber-500 hover:text-amber-600" : "text-slate-400 hover:text-indigo-600"}
              onClick={() => onCapture(sentence.id)}
            >
              {sentence.reviewItem ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-grow flex flex-col items-center p-8 space-y-8 w-full relative">
          <div className="flex-grow flex flex-col items-center justify-center w-full relative gap-8">
            
            {isEditingText ? (
                <div className="w-full max-w-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <Textarea 
                        value={tempText} 
                        onChange={(e) => setTempText(e.target.value)} 
                        className="text-xl font-medium min-h-[120px] resize-none"
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsEditingText(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleSaveText} disabled={!tempText.trim()}>
                            <Check className="w-4 h-4 mr-2" /> Save Text
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="relative group">
                    <InteractiveText
                    text={sentence.text}
                    formatting={localFormatting}
                    mode="edit"
                    activeTool={activeTool}
                    onChange={setLocalFormatting}
                    className="text-2xl font-medium text-slate-700 leading-loose text-center max-w-xl"
                    />
                    {/* Edit Button */}
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute -right-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setIsEditingText(true)}
                        title="Edit Text"
                    >
                        <Edit3 className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                    </Button>
                </div>
            )}
            
            {!isEditingText && <NotationToolbar activeTool={activeTool} onToolChange={setActiveTool} />}
          </div>

          {/* Visualization Area */}
          <div className="w-full space-y-4">
            {!originalBlob && (
              <div className="flex items-center justify-center text-slate-400 gap-2 h-32">
                <Loader2 className="h-6 w-6 animate-spin" /> Loading audio segment...
              </div>
            )}

            {(mode === "idle" || mode === "playing_original" || mode === "recording") &&
              originalBlob && (
                <div className="opacity-80">
                  <MiniWavePlayer
                    key={sentence.id + "-original"} // Force reset on change
                    audioBlob={originalBlob}
                    label="Original"
                    waveColor="#94a3b8"
                    progressColor="#475569"
                    playbackRate={playbackRate}
                    enableRegions={true}
                    RightAction={
                       <Button 
                        size="icon" 
                        variant={isLooping ? "default" : "secondary"}
                        className={`rounded-full h-10 w-10 shrink-0 shadow-sm ${isLooping ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white hover:bg-slate-100"}`}
                        onClick={toggleLoop}
                        title="Loop Playback"
                       >
                          {isLooping ? <Pause className="h-4 w-4" /> : <Repeat className="h-4 w-4 text-slate-700" />}
                       </Button>
                    }
                  />
                </div>
              )}

            {mode === "recording" && (
              <div className="h-20 flex items-center justify-center gap-4">
                <div className="flex items-center justify-center text-red-500 animate-pulse font-bold text-lg gap-2 bg-red-50 rounded-lg border border-red-100 px-6 py-2">
                  <Mic className="h-6 w-6" /> Recording...
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200"
                  onClick={handleRecAgain}
                >
                  <RotateCcw className="h-4 w-4" /> Restart
                </Button>
              </div>
            )}

            {mode === "reviewing" && originalBlob && userBlob && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <MiniWavePlayer
                  key={sentence.id + "-original-review"}
                  audioBlob={originalBlob}
                  label="Original"
                  waveColor="#94a3b8"
                  progressColor="#475569"
                  playbackRate={playbackRate}
                  RightAction={
                       <Button 
                        size="icon" 
                        variant={isLooping ? "default" : "secondary"}
                        className={`rounded-full h-10 w-10 shrink-0 shadow-sm ${isLooping ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white hover:bg-slate-100"}`}
                        onClick={toggleLoop}
                       >
                          {isLooping ? <Pause className="h-4 w-4" /> : <Repeat className="h-4 w-4 text-slate-700" />}
                       </Button>
                  }
                />
                <MiniWavePlayer
                  key={sentence.id + "-user"}
                  audioBlob={userBlob}
                  label="Your Voice"
                  waveColor="#fca5a5"
                  progressColor="#e11d48"
                  autoPlay={true}
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="h-16 flex items-center justify-center w-full relative">
            {mode === "idle" && (
              <Button
                size="lg"
                className="rounded-full px-8 text-lg gap-2 shadow-lg shadow-indigo-200"
                onClick={startFlow}
              >
                <Play className="h-5 w-5" /> Start Challenge
              </Button>
            )}

            {mode === "playing_original" && (
              <div className="text-indigo-600 animate-pulse font-bold text-lg flex items-center gap-2">
                <Play className="h-6 w-6" /> Listening...
              </div>
            )}

            {mode === "reviewing" && (
              <div className="flex gap-4">
                <Button variant="outline" size="lg" onClick={startFlow} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Full Retry
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 gap-2"
                  onClick={handleRecAgain}
                >
                  <Mic className="h-4 w-4" /> Rec Again
                </Button>
                <Button size="lg" onClick={handleNext} className="gap-2">
                  Next <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 flex justify-between border-t">
          <Button variant="ghost" onClick={handlePrev} disabled={currentIndex === 0}>
            Previous
          </Button>
          <div className="text-slate-400 text-sm flex items-center">
            {mode === "reviewing" ? "Compare waveforms & audio" : "Listen -> Record -> Compare"}
          </div>
          <Button variant="ghost" onClick={handleNext} disabled={currentIndex === totalCount - 1}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}