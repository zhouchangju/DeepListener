import { useEffect, RefObject } from "react";

interface UseAudioInteractionsProps {
  containerRef: RefObject<HTMLDivElement | null>;
  isReady: boolean;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  onPlayPause: () => void;
}

export function useAudioInteractions({
  containerRef,
  isReady,
  setZoomLevel,
  onPlayPause,
}: UseAudioInteractionsProps) {
  // Keyboard (Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName);
      if (e.code === "Space" && !isInput) {
        e.preventDefault();
        onPlayPause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPlayPause]);

  // Mouse Wheel (Zoom/Pan)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!isReady) return;
      if (Math.abs(e.deltaY) < 1) return;
      e.preventDefault();

      if (e.shiftKey) {
        const scrollable = container.querySelector("div");
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
        const scrollable = container.querySelector("div");
        if (!scrollable) return;
        isDragging = true;
        startX = e.clientX;
        startScrollLeft = scrollable.scrollLeft;
        document.body.style.cursor = "grabbing";
        container.style.cursor = "grabbing";
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const scrollable = container.querySelector("div");
      if (!scrollable) return;
      scrollable.scrollLeft = startScrollLeft - (e.clientX - startX) * 1.5;
      e.preventDefault();
      e.stopPropagation();
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = "default";
        container.style.cursor = "crosshair";
      }
    };

    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("mouseup", onMouseUp, true);
    window.addEventListener("contextmenu", (e) => {
      if (container.contains(e.target as Node)) e.preventDefault();
    });

    return () => {
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("mousemove", onMouseMove, true);
      window.removeEventListener("mouseup", onMouseUp, true);
      window.removeEventListener("contextmenu", (e) => {
        if (container.contains(e.target as Node)) e.preventDefault();
      });
    };
  }, [isReady]);
}
