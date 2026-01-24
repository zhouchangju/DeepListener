"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import Minimap from "wavesurfer.js/dist/plugins/minimap.js";
import { Button } from "@/components/ui/button";
import { Play, Pause, Repeat, Save, MousePointer2, Hand, ZoomIn, ZoomOut, Eraser } from "lucide-react";

interface Sentence {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

interface AudioPlayerProps {
  audioUrl: string;
  sentences: Sentence[];
  onCapture: (sentenceId: string) => void;
}

export default function AudioPlayer({ audioUrl, sentences, onCapture }: AudioPlayerProps) {
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

  // 强力对齐函数：让列表瞬间居中指定的句子
  const syncListToTime = (time: number, force: boolean = false) => {
    // 增加 0.1s 的容差
    let index = sentences.findIndex(s => time >= s.startTime - 0.1 && time <= s.endTime + 0.1);
    
    // Gap Persistence Logic
    if (index === -1) {
      if (force) {
        index = sentences.findLastIndex(s => s.startTime <= time + 0.2);
      } else {
        if (activeSentenceIndex !== -1) {
           const active = sentences[activeSentenceIndex];
           if (time < active.endTime + 1.0) {
             index = activeSentenceIndex;
           }
        }
      }
    }

    if (index !== -1) {
      if (index !== activeSentenceIndex) {
        setActiveSentenceIndex(index);
      }

      if ((force || index !== activeSentenceIndex) && listContainerRef.current) {
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
      setTimeout(() => {
        ws.setTime(region.start);
        setCurrentTime(region.start);
        syncListToTime(region.start, true);
        ws.play();
      }, 50);
    });

    ws.load(audioUrl).catch(() => {});
    wavesurferRef.current = ws;

    ws.on("ready", () => setIsReady(true));
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    
    // 核心逻辑：播放同步 & 循环检查 (直接在 timeupdate 中处理)
    ws.on("timeupdate", (time) => {
      setCurrentTime(time);
      syncListToTime(time, false);

      // 1. 选区循环 (最高优先级)
      const activeRegions = regions.getRegions();
      if (activeRegions.length > 0) {
        const region = activeRegions[0];
        // 增加容错：如果播到了选区末尾，或者甚至跳到了选区之前（异常），都拉回
        if (time >= region.end - 0.05 || time < region.start - 0.5) {
           ws.setTime(region.start);
        }
      } 
      // 2. 句子循环 (仅在开启 Loop 且无选区时)
      // 注意：这里需要从 ref 或者闭包中获取最新的 loopMode，由于闭包陷阱，
      // 我们可能需要用 useRef 来存储 loopMode 状态，或者依赖 React 重新绑定 listener。
      // 但为了性能，WaveSurfer 建议在外部处理。
      // 这里我做了一个折衷：通过 DOM 状态或 ref 穿透来获取 loopMode。
      // 为了简单起见，我们暂时允许 React 重建这个 listener (依赖项变化时)
    });
    
    ws.on("interaction", (time) => {
      setCurrentTime(time);
      syncListToTime(time, true);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
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
  }, [audioUrl]); // 这里如果不依赖 loopMode，会导致闭包里的 loopMode 永远是 false

  // 这里的 useEffect 专门处理 LoopMode 的变化，动态注入逻辑不太好。
  // 更好的办法是用 useRef 存储 loopMode，这样 useEffect 就不需要依赖 loopMode 变化而重置 WaveSurfer
  const loopModeRef = useRef(loopMode);
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);

  const sentencesRef = useRef(sentences);
  useEffect(() => { sentencesRef.current = sentences; }, [sentences]);

  // 更新 timeupdate 监听器以使用最新的 Ref
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    const onTimeUpdate = (time: number) => {
      // 使用 Ref 穿透闭包获取最新状态
      const activeRegions = regionsRef.current?.getRegions();
      
      if (activeRegions && activeRegions.length > 0) {
        const region = activeRegions[0];
        if (time >= region.end - 0.05 || time < region.start - 0.1) {
           ws.setTime(region.start);
        }
      } else if (loopModeRef.current) {
        // 句子循环
        const activeSentence = sentencesRef.current.find(s => time >= s.startTime && time <= s.endTime);
        if (activeSentence && time >= activeSentence.endTime - 0.05) {
          ws.setTime(activeSentence.startTime);
        }
      }
    };

    // 先解绑旧的，再绑定新的 (虽然这里 ws 没变，但我们要确保逻辑唯一)
    ws.un('timeupdate', onTimeUpdate); 
    ws.on('timeupdate', onTimeUpdate);

    return () => {
      ws.un('timeupdate', onTimeUpdate);
    };
  }, [isReady]); // 只要 isReady 了，就挂载这个永久的 listener，内部靠 Ref 更新

  useEffect(() => {
    if (isReady && wavesurferRef.current) wavesurferRef.current.zoom(zoomLevel);
  }, [zoomLevel, isReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (!isReady) return;
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let isDragging = false;
    let startX: number;
    let startScrollLeft: number;
    const onMouseDown = (e: MouseEvent) => {
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
      if (!scrollable) return;
      scrollable.scrollLeft = startScrollLeft - (e.clientX - startX) * 1.5;
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

  const toggleDebug = (e: React.MouseEvent) => {
    if (e.altKey) {
      setDebugMode(!debugMode);
      console.log("Debug Mode:", !debugMode ? "ON" : "OFF");
      if (!debugMode) {
        console.table(sentences.map(s => ({
          text: s.text.substring(0, 20) + "...",
          start: s.startTime,
          end: s.endTime,
          duration: s.endTime - s.startTime
        })));
      }
    }
  };

  return (
    <div className="flex flex-col gap-0 w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-6">
          <Button variant="default" size="icon" className="bg-indigo-600 hover:bg-indigo-700 h-12 w-12 rounded-full" onClick={() => wavesurferRef.current?.playPause()}>
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
          </Button>
          <div className="flex flex-col" onClick={toggleDebug} title="Alt+Click to toggle Debug Mode">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-help">Position</span>
            <span className="text-2xl font-mono text-slate-700">
              {new Date(currentTime * 1000).toISOString().substr(14, 5)}
              <span className="text-slate-300 text-lg"> / {new Date((isReady ? wavesurferRef.current?.getDuration() || 0 : 0) * 1000).toISOString().substr(14, 5)}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant={loopMode ? "default" : "outline"} size="sm" className={`h-9 rounded-full px-4 ${loopMode ? 'bg-indigo-600 border-transparent shadow-md shadow-indigo-100' : 'text-slate-600'}`} onClick={() => setLoopMode(!loopMode)}>
            <Repeat className="h-4 w-4 mr-2" />
            <span className="text-xs font-bold uppercase">Loop</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => regionsRef.current.clearRegions()} className="h-9 rounded-full text-slate-400 hover:text-red-500">
            <Eraser className="h-4 w-4 mr-2" /> Clear
          </Button>
        </div>
      </div>

      <div className="p-6 bg-white">
        <div ref={timelineRef} className="mb-2 opacity-80" />
        <div ref={containerRef} className="w-full cursor-crosshair overflow-x-hidden rounded-lg bg-slate-50/50 border border-slate-100" />
        <div className="mt-4 flex justify-between items-center text-[11px] text-slate-400 px-1 font-medium">
          <div className="flex gap-6">
            <span><MousePointer2 className="h-3 w-3 inline mr-1" /> Left-Drag: Select</span>
            <span><Hand className="h-3 w-3 inline mr-1" /> Right-Drag: Pan</span>
            <span><ZoomIn className="h-3 w-3 inline mr-1" /> Scroll: Zoom</span>
          </div>
          <span className="uppercase tracking-tighter">Space: Play/Pause | Shift+Scroll: Pan | Alt+Click Position: Debug</span>
        </div>
      </div>

      <div className="bg-white border-t border-slate-100">
        <div 
          ref={listContainerRef}
          className="max-h-[380px] overflow-y-auto custom-scrollbar p-2 scroll-smooth"
        >
          {sentences.map((s, i) => (
            <div
              key={s.id}
              id={`sentence-${i}`}
              onClick={() => {
                if (debugMode) {
                  console.log(`Sentence ${i}:`, s.text);
                  console.log(`Range: ${s.startTime.toFixed(3)} - ${s.endTime.toFixed(3)}`);
                }
                wavesurferRef.current?.setTime(s.startTime);
                wavesurferRef.current?.play();
                regionsRef.current.clearRegions();
              }}
              className={`group flex items-start gap-4 p-4 rounded-xl transition-all cursor-pointer border-2 mb-1 ${
                i === activeSentenceIndex ? "bg-indigo-50/50 border-indigo-100" : "bg-transparent border-transparent hover:bg-slate-50"
              }`}
            >
              <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${i === activeSentenceIndex ? "bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]" : "bg-slate-200"}`} />
              <div className="flex-grow text-[15px] leading-relaxed text-slate-600">
                {debugMode && <span className="text-[10px] text-red-400 font-mono block mb-1">[{s.startTime.toFixed(2)} - {s.endTime.toFixed(2)}]</span>}
                {s.text}
              </div>
              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-8 text-slate-400 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); onCapture(s.id); }}>
                <Save className="h-4 w-4 mr-2" /> Capture
              </Button>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}