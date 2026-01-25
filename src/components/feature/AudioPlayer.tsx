"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import Minimap from "wavesurfer.js/dist/plugins/minimap.js";
import { Button } from "@/components/ui/button";
import { Play, Pause, Repeat, Save, MousePointer2, Hand, ZoomIn, ZoomOut, Eraser, Mic2, BookmarkCheck } from "lucide-react";

interface Sentence {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  reviewItem?: any;
}

interface AudioPlayerProps {
  audioUrl: string;
  sentences: Sentence[];
  onCapture: (sentenceId: string) => void;
  onShadowing: (index: number) => void;
  blindMode?: boolean;
}

export default function AudioPlayer({ audioUrl, sentences: rawSentences, onCapture, onShadowing, blindMode = false }: AudioPlayerProps) {
  const sentences = rawSentences.map((s, i) => {
    const next = rawSentences[i + 1];
    if (next && s.endTime > next.startTime) {
      return { ...s, endTime: next.startTime - 0.05 };
    }
    return s;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loopMode, setLoopMode] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
  const [zoomLevel, setZoomLevel] = useState(25);
  const [isReady, setIsReady] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // 用户滚动意图检测
  const isUserScrolling = useRef(false);
  const userScrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const onListScroll = () => {
    isUserScrolling.current = true;
    if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
    userScrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 2000);
  };

  useEffect(() => {
    setRevealedIds(new Set());
  }, [blindMode]);

  const syncListToTime = (time: number, force: boolean = false) => {
    let index = sentences.findIndex(s => time >= s.startTime - 0.1 && time <= s.endTime + 0.1);
    if (index === -1) {
      if (force) {
        index = sentences.findLastIndex(s => s.startTime <= time + 0.2);
      } else if (activeSentenceIndex !== -1) {
        const active = sentences[activeSentenceIndex];
        if (time < active.endTime + 1.0) index = activeSentenceIndex;
      }
    }

    if (index !== -1) {
      if (index !== activeSentenceIndex) {
        setActiveSentenceIndex(index);
      }

      const shouldScroll = force || (index !== activeSentenceIndex && !isUserScrolling.current);
      if (shouldScroll && listContainerRef.current) {
        requestAnimationFrame(() => {
          const container = listContainerRef.current!;
          const el = document.getElementById(`sentence-${index}`);
          if (el) {
            const top = el.offsetTop - container.offsetTop;
            const targetScroll = top - (container.clientHeight / 2) + (el.clientHeight / 2);
            container.scrollTo({ top: targetScroll, behavior: 'smooth' });
          }
        });
      }
    }
  };

  useEffect(() => {
    if (!containerRef.current || !timelineRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#cbd5e1",
      progressColor: "#4f46e5",
      cursorColor: "#f43f5e",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      height: 100,
      minPxPerSec: zoomLevel,
      autoCenter: true,
      shadowDOM: false,
      plugins: [
        TimelinePlugin.create({ container: timelineRef.current }),
        Minimap.create({ height: 20, waveColor: '#eee', progressColor: '#4f46e5' })
      ],
    });

    const regions = ws.registerPlugin(RegionsPlugin.create());
    regionsRef.current = regions;
    regions.enableDragSelection({ color: 'rgba(79, 70, 229, 0.15)' });

    regions.on('region-created', (region) => {
      regions.getRegions().forEach(r => { if (r !== region) r.remove(); });
    });

    regions.on('region-update-end', (region) => {
      setTimeout(() => {
        ws.setTime(region.start);
        setCurrentTime(region.start);
        syncListToTime(region.start, true);
        ws.play();
      }, 10);
    });

    ws.load(audioUrl).catch(() => {});
    wavesurferRef.current = ws;

    ws.on("ready", () => setIsReady(true));
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("timeupdate", (time) => {
      setCurrentTime(time);
      syncListToTime(time, false);
    });
    ws.on("interaction", (time) => {
      setCurrentTime(time);
      syncListToTime(time, true);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName);
      if (e.code === "Space" && !isInput) {
        e.preventDefault();
        ws.playPause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      ws.unAll();
      setTimeout(() => { try { ws.destroy(); } catch (e) {} }, 0);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (isReady && wavesurferRef.current) wavesurferRef.current.zoom(zoomLevel);
  }, [zoomLevel, isReady]);

  // Wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (!isReady) return;
      if (Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      if (e.shiftKey) {
        const scrollable = container.querySelector('div');
        if (scrollable) scrollable.scrollLeft += e.deltaY;
      } else {
        setZoomLevel((prev) => {
          const factor = e.deltaY > 0 ? 0.85 : 1.15;
          return Math.max(10, Math.min(800, prev * factor));
        });
      }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [isReady]);

  // Right Click Pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let isDragging = false;
    let startX: number;
    let startScrollLeft: number;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) return;
      if (e.button === 2 && container.contains(e.target as Node)) {
        const scrollable = container.querySelector('div');
        if (!scrollable) return;
        isDragging = true;
        startX = e.clientX;
        startScrollLeft = scrollable.scrollLeft;
        document.body.style.cursor = 'grabbing';
        e.preventDefault(); e.stopPropagation();
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const scrollable = container.querySelector('div');
      if (scrollable) scrollable.scrollLeft = startScrollLeft - (e.clientX - startX) * 1.5;
    };
    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = 'default';
      }
    };
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('contextmenu', (e) => { if (container.contains(e.target as Node)) e.preventDefault(); });
    return () => {
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mousemove', onMouseMove, true);
      window.removeEventListener('mouseup', onMouseUp, true);
    };
  }, [isReady]);

  // Loop
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady) return;
    const onTimeUpdate = (time: number) => {
      const activeRegions = regionsRef.current?.getRegions();
      if (activeRegions && activeRegions.length > 0) {
        const region = activeRegions[0];
        if (time >= region.end - 0.05 || time < region.start - 0.5) ws.setTime(region.start);
      } else if (loopMode) {
        const activeSentence = sentences.find(s => time >= s.startTime && time <= s.endTime);
        if (activeSentence && time >= activeSentence.endTime - 0.05) ws.setTime(activeSentence.startTime);
      }
    };
    ws.on('timeupdate', onTimeUpdate);
    return () => { ws.un('timeupdate', onTimeUpdate); };
  }, [loopMode, isReady, sentences]);

  const toggleDebug = (e: React.MouseEvent) => {
    if (e.altKey) setDebugMode(!debugMode);
  };

  return (
    <div className="flex flex-col gap-0 w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* 顶部控制栏 */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 bg-slate-50 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button variant="default" size="icon" className="bg-indigo-600 hover:bg-indigo-700 h-12 w-12 rounded-full shrink-0" onClick={() => wavesurferRef.current?.playPause()}>
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
          </Button>
          <div className="flex flex-col overflow-hidden" onClick={toggleDebug}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-help">Position</span>
            <span className="text-xl sm:text-2xl font-mono text-slate-700 truncate">
              {new Date(currentTime * 1000).toISOString().substr(14, 5)}
              <span className="text-slate-300 text-lg"> / {new Date((isReady ? wavesurferRef.current?.getDuration() || 0 : 0) * 1000).toISOString().substr(14, 5)}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button variant={loopMode ? "default" : "outline"} size="sm" className={`h-9 rounded-full px-4 ${loopMode ? 'bg-indigo-600 border-transparent text-white' : 'text-slate-600'}`} onClick={() => setLoopMode(!loopMode)}>
            <Repeat className="h-4 w-4 mr-2" />
            <span className="text-xs font-bold uppercase">Loop</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => regionsRef.current.clearRegions()} className="h-9 rounded-full text-slate-400 hover:text-red-500">
            <Eraser className="h-4 w-4 mr-2" /> Clear
          </Button>
        </div>
      </div>

      {/* 波形区域 */}
      <div className="p-4 sm:p-6 bg-white">
        <div ref={timelineRef} className="mb-2 opacity-80" />
        <div ref={containerRef} className="w-full cursor-crosshair overflow-x-hidden rounded-lg bg-slate-50/50 border border-slate-100" />
        <div className="mt-4 hidden sm:flex justify-between items-center text-[11px] text-slate-400 px-1 font-medium">
          <div className="flex gap-6">
            <span><MousePointer2 className="h-3 w-3 inline mr-1" /> Left-Drag: Select</span>
            <span><Hand className="h-3 w-3 inline mr-1" /> Right-Drag: Pan</span>
            <span><ZoomIn className="h-3 w-3 inline mr-1" /> Scroll: Zoom</span>
          </div>
          <span className="uppercase tracking-tighter">Space: Play/Pause</span>
        </div>
      </div>

      {/* 句子列表 */}
      <div className="bg-white border-t border-slate-100">
        <div ref={listContainerRef} onScroll={onListScroll} className="max-h-[450px] overflow-y-auto custom-scrollbar p-2 scroll-smooth">
          {sentences.map((s, i) => {
            const isActive = i === activeSentenceIndex;
            const isBlurred = blindMode && !revealedIds.has(s.id);
            const isSaved = !!s.reviewItem;

            return (
              <div
                key={s.id}
                id={`sentence-${i}`}
                onClick={() => {
                  if (blindMode) setRevealedIds(prev => new Set(prev).add(s.id));
                  wavesurferRef.current?.setTime(s.startTime);
                  wavesurferRef.current?.play();
                  regionsRef.current.clearRegions();
                }}
                className={`group flex flex-col sm:flex-row items-start gap-2 sm:gap-4 p-4 rounded-xl transition-all cursor-pointer border-2 mb-2 ${
                  isActive ? "bg-indigo-50/50 border-indigo-100 shadow-sm" : 
                  isSaved ? "bg-amber-50/30 border-amber-100/50" : "bg-transparent border-transparent hover:bg-slate-50"
                }`}
              >
                {/* 状态点 - PC */}
                <div className={`mt-2.5 w-1.5 h-1.5 rounded-full shrink-0 hidden sm:block ${
                  isActive ? "bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]" : 
                  isSaved ? "bg-amber-400" : "bg-slate-200"
                }`} />

                {/* 文本内容 */}
                <div className="flex-grow w-full">
                  <p className={`text-[15px] sm:text-[16px] leading-relaxed transition-all duration-300 ${isBlurred ? "blur-sm select-none text-slate-300" : "text-slate-700"}`}>
                    {debugMode && <span className="text-[10px] text-red-400 font-mono block mb-1">[{s.startTime.toFixed(2)} - {s.endTime.toFixed(2)}]</span>}
                    {s.text}
                  </p>
                  
                  {/* 移动端操作栏 - 文本下方 */}
                  <div className="mt-3 flex sm:hidden items-center gap-4">
                    <Button variant="outline" size="sm" className="h-8 rounded-full text-[11px] font-bold px-3 gap-1.5 border-slate-200" onClick={(e) => { e.stopPropagation(); onShadowing(i); }}>
                      <Mic2 className="h-3.5 w-3.5 text-indigo-500" /> SHADOWING
                    </Button>
                    <Button variant="outline" size="sm" className={`h-8 rounded-full text-[11px] font-bold px-3 gap-1.5 ${isSaved ? 'bg-amber-50 text-amber-600 border-amber-200' : 'border-slate-200 text-slate-500'}`} onClick={(e) => { e.stopPropagation(); onCapture(s.id); }}>
                      {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                      {isSaved ? 'SAVED' : 'CAPTURE'}
                    </Button>
                  </div>
                </div>

                {/* PC端操作栏 - 右侧显示 */}
                <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-0" title="Shadowing" onClick={(e) => { e.stopPropagation(); onShadowing(i); }}>
                    <Mic2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${isSaved ? "text-amber-500 hover:text-amber-600" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`} title={isSaved ? "Already Saved" : "Capture to Vault"} onClick={(e) => { e.stopPropagation(); onCapture(s.id); }}>
                    {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}