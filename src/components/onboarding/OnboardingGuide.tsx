"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
 * An accessible, controlled guide dialog. Completion is persisted only after
 * the user explicitly skips or finishes; dismissing it leaves it eligible to
 * be shown again by the parent.
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
  const totalSteps = steps.length;
  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === totalSteps - 1;

  if (totalSteps === 0 || !currentStep) {
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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setCurrentIndex(0);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
            {progressLabel}
          </p>
          <DialogTitle>{currentStep.title}</DialogTitle>
          <DialogDescription>{currentStep.description}</DialogDescription>
        </DialogHeader>

        <div
          className="flex gap-2"
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

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => closeAfterCompletion("skip")}>
            {t("skip")}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => index - 1)}
            >
              {t("previous")}
            </Button>
            <Button
              type="button"
              onClick={() =>
                isLastStep
                  ? closeAfterCompletion("complete")
                  : setCurrentIndex((index) => index + 1)
              }
            >
              {isLastStep ? t("finish") : t("next")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
