"use client";

import { useCallback, useEffect, useState } from "react";

import { ONBOARDING_STORAGE_KEY } from "./OnboardingGuide";

export interface OnboardingStatus {
  hasCompleted: boolean;
  isReady: boolean;
  complete: () => void;
  reset: () => void;
}

/** Safely exposes whether the one-time guide should be offered. */
export function useOnboardingStatus(storageKey = ONBOARDING_STORAGE_KEY): OnboardingStatus {
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      setHasCompleted(window.localStorage.getItem(storageKey) === "true");
    } catch {
      setHasCompleted(false);
    } finally {
      setIsReady(true);
    }
  }, [storageKey]);

  const complete = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // Storage is optional; the active session still treats the guide as done.
    }
    setHasCompleted(true);
  }, [storageKey]);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Keep the component usable when browser storage is unavailable.
    }
    setHasCompleted(false);
  }, [storageKey]);

  return { hasCompleted, isReady, complete, reset };
}
