"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";

import { GuideTrigger, OnboardingGuide, useOnboardingStatus } from "@/components/onboarding";
import { LanguageToggle } from "@/components/preferences";
import ThemeToggle from "@/components/theme/ThemeToggle";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const t = useTranslations("onboarding");
  const navT = useTranslations("nav");
  const { hasCompleted, isReady, complete } = useOnboardingStatus();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (isReady && !hasCompleted) {
      const timer = window.setTimeout(() => setIsGuideOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [hasCompleted, isReady]);

  const steps = [
    { id: "library", title: t("library.title"), description: t("library.description") },
    { id: "setup", title: t("setup.title"), description: t("setup.description") },
    { id: "practice", title: t("practice.title"), description: t("practice.description") },
    { id: "review", title: t("review.title"), description: t("review.description") },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 overflow-hidden px-4">
          <Link href="/" className="mr-2 shrink-0 text-xl font-bold text-foreground transition-colors hover:text-muted-foreground">
            DeepListener
          </Link>
          <div className="flex h-full min-w-0 flex-1 items-center justify-end gap-1">
            <div className="no-scrollbar flex h-full items-center gap-3 overflow-x-auto text-sm font-medium text-muted-foreground md:gap-6">
              <Link href="/library" className="whitespace-nowrap transition-colors hover:text-foreground">{navT("library")}</Link>
              <Link href="/setup" className="whitespace-nowrap transition-colors hover:text-foreground">{navT("setup")}</Link>
              <Link href="/vault" className="whitespace-nowrap transition-colors hover:text-foreground">{navT("vault")}</Link>
              <Link href="/dashboard" className="whitespace-nowrap transition-colors hover:text-foreground">{navT("analytics")}</Link>
              <Link href="/review" className="whitespace-nowrap transition-colors hover:text-foreground">{navT("review")}</Link>
            </div>
            <GuideTrigger
              className="h-9 gap-1.5 px-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setIsGuideOpen(true)}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t("replayShort")}</span>
              <span className="sr-only">{t("replay")}</span>
            </GuideTrigger>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <main className="min-h-[calc(100vh-64px)] bg-muted/30">{children}</main>
      <OnboardingGuide
        open={isGuideOpen}
        onOpenChange={(open) => {
          if (!open && !hasCompleted) {
            complete();
          }
          setIsGuideOpen(open);
        }}
        steps={steps}
        onComplete={complete}
        onSkip={complete}
      />
    </>
  );
}
