"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Compass, Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { GuideTrigger, OnboardingGuide, useOnboardingStatus } from "@/components/onboarding";
import { LanguageToggle } from "@/components/preferences";
import ThemeToggle from "@/components/theme/ThemeToggle";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";
import NavStreak from "./NavStreak";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link href="/" className="mr-2 shrink-0 text-xl font-bold text-foreground transition-colors hover:text-muted-foreground">
            DeepListener
          </Link>
          <div className="flex h-full min-w-0 flex-1 items-center justify-end gap-1">
            {/*
              Desktop nav. The container no longer uses overflow-hidden: that
              clipped nav links when the right-side icon cluster (streak,
              guide, language, theme, shortcuts) pushed them past the edge,
              which made links look like they vanished on hover. Instead the
              nav row scrolls horizontally with a hidden scrollbar so links
              stay reachable at any width.
            */}
            <div className="no-scrollbar hidden h-full min-w-0 items-center gap-3 overflow-x-auto text-sm font-medium text-muted-foreground md:flex md:gap-6">
              <Link href="/library" data-tour="nav-library" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">{navT("library")}</Link>
              <Link href="/setup" data-tour="nav-setup" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">{navT("setup")}</Link>
              <Link href="/vault" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">{navT("vault")}</Link>
              <Link href="/dashboard" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">{navT("analytics")}</Link>
              <Link href="/review" data-tour="nav-review" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">{navT("review")}</Link>
            </div>
            {/*
              Mobile nav: previously the same inline row was used with a hidden
              scrollbar, so phone users had no cue that Vault / Dashboard /
              Review lived off-screen to the right. A dedicated menu button is
              an explicit, reachable affordance for those pages.
            */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
                  aria-label={navT("menu")}
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem]">
                <DropdownMenuItem asChild>
                  <Link href="/library" className="cursor-pointer">{navT("library")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/setup" className="cursor-pointer">{navT("setup")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/vault" className="cursor-pointer">{navT("vault")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">{navT("analytics")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/review" className="cursor-pointer">{navT("review")}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <NavStreak />
            <GuideTrigger
              data-tour="guide-trigger"
              className="h-9 gap-1.5 px-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setIsGuideOpen(true)}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t("replayShort")}</span>
              <span className="sr-only">{t("replay")}</span>
            </GuideTrigger>
            <LanguageToggle />
            <ThemeToggle />
            <KeyboardShortcutsHelp />
          </div>
        </div>
      </nav>
      <main className="min-h-[calc(100vh-64px)] bg-muted/30">{children}</main>
      <OnboardingGuide
        // Remount when the guide opens so internal step state resets to 0
        // without a reset effect (avoids the react-hooks cascading-render
        // rule). The component returns null when closed.
        key={isGuideOpen ? "onboarding-open" : "onboarding-closed"}
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
