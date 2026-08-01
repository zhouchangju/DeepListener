"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

type StudyMode = "IDLE" | "LISTENING" | "SHADOWING" | "REVIEW";

interface TimeTrackingContextType {
  mode: StudyMode;
  setMode: (mode: StudyMode) => void;
}

const TimeTrackingContext = createContext<TimeTrackingContextType>({
  mode: "IDLE",
  setMode: () => {},
});

export const useTimeTracking = () => useContext(TimeTrackingContext);

export function TimeTrackingProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<StudyMode>("IDLE");
  const lastActiveRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Activity detection
  useEffect(() => {
    lastActiveRef.current = Date.now();

    const updateActivity = () => {
      lastActiveRef.current = Date.now();
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
    };
  }, []);

  // Heartbeat loop
  useEffect(() => {
    // Only run timer if not IDLE
    if (mode === "IDLE") return;

    const tick = async () => {
      // Skip the heartbeat while the tab is hidden: a backgrounded tab keeps
      // no active user interaction, and browsers throttle setInterval so the
      // 10s cadence would drift anyway. Audio keeps playing in the background
      // for the user; we simply stop billing study time until they return.
      if (document.hidden) return;

      const now = Date.now();
      const timeSinceActive = now - lastActiveRef.current;

      // Check for audio playing
      let isAudioPlaying = false;
      const audios = document.querySelectorAll("audio");
      audios.forEach(audio => {
        if (!audio.paused && !audio.ended && audio.readyState > 2) {
          isAudioPlaying = true;
        }
      });

      // Active condition: Audio playing OR recent user interaction (< 60s)
      if (isAudioPlaying || timeSinceActive < 60000) {
        try {
          await fetch("/api/study-time", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: mode, duration: 10 }),
          });
        } catch (e) {
          console.error("Heartbeat failed", e);
        }
      }
    };

    intervalRef.current = setInterval(tick, 10000); // 10s heartbeat

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mode]);

  return (
    <TimeTrackingContext.Provider value={{ mode, setMode }}>
      {children}
    </TimeTrackingContext.Provider>
  );
}
