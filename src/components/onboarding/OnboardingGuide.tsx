"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export const ONBOARDING_STORAGE_KEY = "deeplistener:onboarding-completed";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
}

export interface OnboardingGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: readonly OnboardingStep[];
  storageKey?: string;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function getOnboardingProgressLabel(current: number, total: number) {
  return `Step ${current} of ${total}`;
}

function persistCompletion(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, "true");
  } catch {
    // Private browsing and disabled storage must not block the guide.
  }
}

/**
 * Selector for the element each step should highlight, keyed by step id. The
 * selectors point at stable `data-tour` attributes on the global nav so the
 * guide works on any page (the nav is always mounted by AppShell).
 */
const STEP_TARGET_SELECTORS: Record<string, string> = {
  library: '[data-tour="nav-library"]',
  setup: '[data-tour="nav-setup"]',
  practice: '[data-tour="nav-library"]',
  review: '[data-tour="nav-review"]',
};

/**
 * When the target element is not visible on screen (mainly on mobile, where
 * the nav links live inside the hamburger menu), the spotlight falls back to
 * a centered bubble. To keep that useful rather than a dead end, each step
 * also carries the URL it describes so the centered bubble can offer a
 * "go there now" button.
 */
const STEP_HREF: Record<string, string> = {
  library: "/library",
  setup: "/setup",
  practice: "/library",
  review: "/review",
};

const HIGHLIGHT_PADDING = 8;

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  /** Viewport dimensions captured at measure time so render never reads
   *  `window` directly (which crashes during SSR / prerender). */
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Spotlight-style onboarding guide.
 *
 * The previous version was a small centered dialog with text-only steps. That
 * does not match modern onboarding expectations: users could not tell which
 * real UI element each step referred to. This version dims the whole screen
 * and cuts a hole around the target element (the reverse-box-shadow trick),
 * with the step bubble positioned next to it. No third-party tour library is
 * pulled in — the implementation is ~100 lines and targets stable nav
 * elements that exist on every page.
 */
export function OnboardingGuide({
  open,
  onOpenChange,
  steps,
  storageKey = ONBOARDING_STORAGE_KEY,
  onComplete,
  onSkip,
}: OnboardingGuideProps) {
  const t = useTranslations("onboarding");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const totalSteps = steps.length;
  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === totalSteps - 1;

  // The parent remounts this component (via a `key`) whenever the guide opens,
  // so `currentIndex` always starts at 0 for a fresh run without needing a
  // reset effect (which the react-hooks rules flag as a cascading render).

  const measureTarget = useCallback(() => {
    const selector = currentStep ? STEP_TARGET_SELECTORS[currentStep.id] : null;
    if (!selector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    // If the target is fully outside the viewport (e.g. it lives inside the
    // mobile hamburger menu which is closed), fall back to centered mode
    // rather than pointing the spotlight at empty space.
    const inViewport =
      rect.bottom > 0 &&
      rect.top < window.innerHeight &&
      rect.right > 0 &&
      rect.left < window.innerWidth;
    if (!inViewport) {
      setTargetRect(null);
      return;
    }
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  }, [currentStep]);

  // Re-measure whenever the step changes, and on viewport changes so the
  // spotlight tracks the target if the layout reflows. All measurements are
  // funneled through a rAF so setState never fires synchronously from a
  // listener (which the linter flags as a cascading-render risk).
  useEffect(() => {
    if (!open || !currentStep) return;
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measureTarget();
      });
    };
    // Defer one frame so the target has a chance to render (e.g. when the
    // guide opens immediately on first load).
    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [open, currentStep, measureTarget]);

  if (!open || totalSteps === 0 || !currentStep) {
    return null;
  }

  const closeAfterCompletion = (action: "complete" | "skip") => {
    persistCompletion(storageKey);
    setCurrentIndex(0);
    if (action === "complete") {
      onComplete?.();
    } else {
      onSkip?.();
    }
    onOpenChange(false);
  };

  const progressLabel = t("stepLabel", { current: currentIndex + 1, total: totalSteps });

  // Reverse box-shadow: a huge spread on the highlight rectangle paints over
  // everything outside the target, dimming the rest of the UI without nesting
  // DOM or intercepting pointer events on the highlighted element itself.
  const spotlightStyle: CSSProperties = targetRect
    ? {
        position: "fixed",
        top: targetRect.top - HIGHLIGHT_PADDING,
        left: targetRect.left - HIGHLIGHT_PADDING,
        width: targetRect.width + HIGHLIGHT_PADDING * 2,
        height: targetRect.height + HIGHLIGHT_PADDING * 2,
        borderRadius: 12,
        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
        pointerEvents: "none",
        transition: "all 220ms ease",
        zIndex: 60,
      }
    : {
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.55)",
        zIndex: 60,
      };

  // Position the bubble below the target when there is room, otherwise above.
  // Falls back to centered when there is no target rect (or the target is
  // off-screen, e.g. inside the closed mobile menu).
  const BUBBLE_WIDTH = 360;
  const BUBBLE_HEIGHT_ESTIMATE = 220;
  const bubbleStyle: CSSProperties = targetRect
    ? {
        position: "fixed",
        // Prefer below the target; if not enough vertical room, place above.
        top:
          targetRect.top + targetRect.height + HIGHLIGHT_PADDING + 12 + BUBBLE_HEIGHT_ESTIMATE >
          targetRect.viewportHeight
            ? Math.max(16, targetRect.top - HIGHLIGHT_PADDING - 12 - BUBBLE_HEIGHT_ESTIMATE)
            : targetRect.top + targetRect.height + HIGHLIGHT_PADDING + 12,
        left: Math.max(
          16,
          Math.min(targetRect.viewportWidth - 16 - BUBBLE_WIDTH, targetRect.left),
        ),
        width: BUBBLE_WIDTH,
        maxWidth: targetRect.viewportWidth - 32,
        zIndex: 61,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: BUBBLE_WIDTH,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 61,
      };

  return (
    <>
      {/* Click-catcher behind everything so background UI is non-interactive
          while the guide is open, but the spotlighted target stays clickable. */}
      <div
        role="presentation"
        onClick={() => closeAfterCompletion("skip")}
        style={{ position: "fixed", inset: 0, zIndex: 59 }}
        aria-hidden="true"
      />
      <div style={spotlightStyle} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={currentStep.title}
        style={bubbleStyle}
        className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
      >
        <p className="text-xs font-medium text-primary" aria-live="polite">
          {progressLabel}
        </p>
        <h2 className="mt-1 text-lg font-semibold leading-tight">{currentStep.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{currentStep.description}</p>

        {/* When the target element is off-screen (mainly mobile, where nav
            links are inside the hamburger menu), offer a direct link so the
            centered bubble is a launchpad, not a dead end. */}
        {!targetRect && STEP_HREF[currentStep.id] && (
          <Button asChild size="sm" variant="outline" className="mt-3 gap-1.5">
            <Link href={STEP_HREF[currentStep.id]} onClick={() => closeAfterCompletion("complete")}>
              {t("goNow")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}

        <div
          className="mt-4 flex gap-1.5"
          aria-label={progressLabel}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={currentIndex + 1}
        >
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={`h-1 flex-1 rounded-full ${index <= currentIndex ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => closeAfterCompletion("skip")}>
            {t("skip")}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => index - 1)}
            >
              {t("previous")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                isLastStep
                  ? closeAfterCompletion("complete")
                  : setCurrentIndex((index) => index + 1)
              }
            >
              {isLastStep ? t("finish") : t("next")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export interface GuideTriggerProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function GuideTrigger({ onClick, children, className }: GuideTriggerProps) {
  return (
    <Button type="button" variant="ghost" className={className} onClick={onClick}>
      {children}
    </Button>
  );
}
