import { useEffect, useEffectEvent, RefObject } from "react";

interface UseAudioInteractionsProps {
  containerRef: RefObject<HTMLDivElement | null>;
  isReady: boolean;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  onPlayPause: () => void;
  onPrevSentence?: () => void;
  onNextSentence?: () => void;
  onToggleLoop?: () => void;
  onShadowing?: () => void;
}

export function useAudioInteractions({
  containerRef,
  isReady,
  setZoomLevel,
  onPlayPause,
  onPrevSentence,
  onNextSentence,
  onToggleLoop,
  onShadowing,
}: UseAudioInteractionsProps) {
  const handlePlayPause = useEffectEvent(() => {
    onPlayPause();
  });

  const handleZoom = useEffectEvent((deltaY: number) => {
    setZoomLevel((prev) => {
      const factor = deltaY > 0 ? 0.85 : 1.15;
      return Math.max(10, Math.min(800, prev * factor));
    });
  });

  // Keyboard: Space play/pause, ←/→ sentence nav, L loop, S shadowing.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Yield to editable controls (so Space types a space in inputs) and to
      // any open dialog (so activating a focused button inside a modal does
      // not also toggle audio playback). Includes role=textbox so rich-text
      // editors behave the same way as native inputs.
      const isEditable =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable ||
        target.closest(
          '[role="textbox"], [role="dialog"], [data-state="open"], dialog',
        ) !== null;
      if (isEditable || e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === "ArrowLeft" && onPrevSentence) {
        e.preventDefault();
        onPrevSentence();
      } else if (e.key === "ArrowRight" && onNextSentence) {
        e.preventDefault();
        onNextSentence();
      } else if ((e.key === "l" || e.key === "L") && onToggleLoop) {
        e.preventDefault();
        onToggleLoop();
      } else if ((e.key === "s" || e.key === "S") && onShadowing) {
        e.preventDefault();
        onShadowing();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrevSentence, onNextSentence, onToggleLoop, onShadowing]);

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
        handleZoom(e.deltaY);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [containerRef, isReady]);

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

    const onContextMenu = (e: MouseEvent) => {
      if (container.contains(e.target as Node)) e.preventDefault();
    };

    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("mouseup", onMouseUp, true);
    window.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("mousemove", onMouseMove, true);
      window.removeEventListener("mouseup", onMouseUp, true);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [containerRef]);
}
