"use client";

import {
  forwardRef,
  useState,
  useEffect,
  useCallback,
  useRef,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export const ONBOARDING_STORAGE_KEY = "deeplistener:onboarding-completed";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  /** Optional real destination represented by the step. */
  href?: string;
  /** Optional label for the destination action. */
  actionLabel?: string;
}

export type OnboardingCompleteReason = "finish" | "action";
export type OnboardingSkipReason = "skip" | "escape" | "outside";

export interface OnboardingGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: readonly OnboardingStep[];
  storageKey?: string;
  onComplete?: (step: OnboardingStep, reason: OnboardingCompleteReason) => void;
  onSkip?: (step: OnboardingStep, reason: OnboardingSkipReason) => void;
  /** The control that opened the guide; focus returns here when it closes. */
  returnFocusRef?: RefObject<HTMLElement | null>;
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

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  /** Viewport dimensions captured at measure time so render never reads
   *  `window` directly (which crashes during SSR / prerender). */
  viewportWidth: number;
  viewportHeight: number;
}

export interface OverlayRegion {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Build the four dimming regions around a spotlight hole. Keeping this pure
 * makes the most important layering invariant easy to test: no region may
 * cover the highlighted target.
 */
export function getSpotlightOverlayRegions(targetRect: TargetRect): OverlayRegion[] {
  const top = Math.max(0, targetRect.top - HIGHLIGHT_PADDING);
  const left = Math.max(0, targetRect.left - HIGHLIGHT_PADDING);
  const right = Math.min(
    targetRect.viewportWidth,
    targetRect.left + targetRect.width + HIGHLIGHT_PADDING,
  );
  const bottom = Math.min(
    targetRect.viewportHeight,
    targetRect.top + targetRect.height + HIGHLIGHT_PADDING,
  );

  return [
    { top: 0, left: 0, width: targetRect.viewportWidth, height: top },
    { top: bottom, left: 0, width: targetRect.viewportWidth, height: targetRect.viewportHeight - bottom },
    { top, left: 0, width: left, height: bottom - top },
    { top, left: right, width: targetRect.viewportWidth - right, height: bottom - top },
  ].filter((region) => region.width > 0 && region.height > 0);
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hidden && element.getClientRects().length > 0,
  );
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
  returnFocusRef,
}: OnboardingGuideProps) {
  const t = useTranslations("onboarding");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
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

  const closeAfterCompletion = useCallback(
    (
      action: "complete" | "skip",
      reason: OnboardingCompleteReason | OnboardingSkipReason,
    ) => {
      if (!currentStep) return;
      persistCompletion(storageKey);
      setCurrentIndex(0);
      if (action === "complete") {
        onComplete?.(currentStep, reason as OnboardingCompleteReason);
      } else {
        onSkip?.(currentStep, reason as OnboardingSkipReason);
      }
      onOpenChange(false);

      const returnTarget = returnFocusRef?.current ?? previousFocusRef.current;
      if (returnTarget && document.contains(returnTarget)) {
        window.requestAnimationFrame(() => returnTarget.focus());
      }
    },
    [currentStep, onComplete, onOpenChange, onSkip, returnFocusRef, storageKey],
  );

  // Capture the opener and move focus into the guide. The dialog itself is
  // focused first so screen readers announce the title before the controls.
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    previousFocusRef.current = returnFocusRef?.current ?? (active instanceof HTMLElement ? active : null);
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, returnFocusRef]);

  // Escape is a dismissal action even when focus is temporarily on the
  // spotlighted target. Background clicks remain a skip, never a completion.
  useEffect(() => {
    if (!open) return;
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeAfterCompletion("skip", "escape");
    };
    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [closeAfterCompletion, open]);

  // The highlighted nav link remains a real control. Once it is activated by
  // pointer or keyboard, close the guide and record an action completion so a
  // route transition never leaves the spotlight floating over the next page.
  useEffect(() => {
    if (!open || !currentStep) return;
    const selector = STEP_TARGET_SELECTORS[currentStep.id];
    const target = selector ? document.querySelector(selector) : null;
    if (!(target instanceof HTMLElement)) return;
    const handleTargetActivate = () => closeAfterCompletion("complete", "action");
    target.addEventListener("click", handleTargetActivate);
    return () => target.removeEventListener("click", handleTargetActivate);
  }, [closeAfterCompletion, currentStep, open]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open || totalSteps === 0 || !currentStep) {
    return null;
  }

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
        // At 200% zoom the effective CSS viewport can be short enough that
        // the estimated bubble height is larger than the available space.
        // Keep the guide itself reachable instead of allowing its controls to
        // render below the viewport.
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        zIndex: 61,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: BUBBLE_WIDTH,
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        zIndex: 61,
      };

  const targetHref = currentStep.href ?? STEP_HREF[currentStep.id];
  const overlayRegions = targetRect ? getSpotlightOverlayRegions(targetRect) : [];

  return (
    <>
      {/* Dimming regions deliberately leave the spotlight hole empty. A
          full-screen click-catcher used to sit above the nav and made the
          highlighted target impossible to activate. */}
      {targetRect ? (
        overlayRegions.map((region, index) => (
          <div
            key={`onboarding-overlay-${index}`}
            role="presentation"
            onClick={() => closeAfterCompletion("skip", "outside")}
            style={{ ...region, position: "fixed", zIndex: 59 }}
            aria-hidden="true"
          />
        ))
      ) : (
        <div
          role="presentation"
          onClick={() => closeAfterCompletion("skip", "outside")}
          style={{ position: "fixed", inset: 0, zIndex: 59 }}
          aria-hidden="true"
        />
      )}
      <div style={spotlightStyle} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={currentStep.title}
        aria-describedby="onboarding-step-description"
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        style={bubbleStyle}
        className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
      >
        <p className="text-xs font-medium text-primary" aria-live="polite">
          {progressLabel}
        </p>
        <h2 className="mt-1 text-lg font-semibold leading-tight">{currentStep.title}</h2>
        <p id="onboarding-step-description" className="mt-2 text-sm text-muted-foreground">
          {currentStep.description}
        </p>

        {/* When the target element is off-screen (mainly mobile, where nav
            links are inside the hamburger menu), offer a direct link so the
            centered bubble is a launchpad, not a dead end. */}
        {targetHref && (
          <Button asChild size="sm" variant="outline" className="mt-3 gap-1.5">
            <Link href={targetHref} onClick={() => closeAfterCompletion("complete", "action")}>
              {currentStep.actionLabel ?? t("goNow")}
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => closeAfterCompletion("skip", "skip")}
          >
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
                  ? closeAfterCompletion("complete", "finish")
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

export type GuideTriggerProps = ComponentPropsWithoutRef<typeof Button> & {
  onClick: () => void;
};

export const GuideTrigger = forwardRef<HTMLButtonElement, GuideTriggerProps>(function GuideTrigger(
  { onClick, children, className, ...props },
  ref,
) {
  return (
    <Button
      {...props}
      ref={ref}
      type="button"
      variant="ghost"
      className={className}
      onClick={onClick}
    >
      {children}
    </Button>
  );
});
