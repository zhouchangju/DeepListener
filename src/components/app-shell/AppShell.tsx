"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Compass, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  GuideTrigger,
  OnboardingGuide,
  useOnboardingStatus,
  type OnboardingCompleteReason,
  type OnboardingStep,
} from "@/components/onboarding";
import { LanguageToggle } from "@/components/preferences";
import ThemeToggle from "@/components/theme/ThemeToggle";
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp";
import NavStreak from "./NavStreak";
import NavReviewCount from "./NavReviewCount";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ApiError, requireOkResponse } from "@/lib/client-response";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const t = useTranslations("onboarding");
  const navT = useTranslations("nav");
  const errorsT = useTranslations("errors");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isExplicitFirstUseJourney =
    searchParams.get("demo") === "1" ||
    ["media", "subtitle"].includes(searchParams.get("import") ?? "");
  const { hasCompleted, isReady, complete: markOnboardingComplete } = useOnboardingStatus();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [demoStarting, setDemoStarting] = useState(false);
  const guideTriggerRef = useRef<HTMLButtonElement>(null);

  const isNavActive = useCallback(
    (href: string) => pathname === href || pathname?.startsWith(`${href}/`) === true,
    [pathname],
  );
  const navLinkClass = useCallback(
    (href: string) =>
      `shrink-0 whitespace-nowrap rounded-sm transition-colors hover:text-foreground ${
        isNavActive(href) ? "font-semibold text-foreground" : ""
      }`,
    [isNavActive],
  );
  const navLinkProps = useCallback(
    (href: string) => ({
      "aria-current": isNavActive(href) ? ("page" as const) : undefined,
      "data-active": isNavActive(href) ? "true" : "false",
    }),
    [isNavActive],
  );

  useEffect(() => {
    // Setup has its own readiness-first journey. Opening the global tour on
    // top of it would obscure the checks the learner intentionally requested;
    // the Guide button still provides an explicit replay path there.
    if (isReady && !hasCompleted && pathname !== "/setup" && !isExplicitFirstUseJourney) {
      const timer = window.setTimeout(() => setIsGuideOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [hasCompleted, isExplicitFirstUseJourney, isReady, pathname]);

  const startDemo = useCallback(async () => {
    if (demoStarting) return;
    setDemoStarting(true);
    try {
      const response = await fetch("/api/demo", { method: "POST" });
      await requireOkResponse(response, errorsT("api.generic"));
      const data = (await response.json()) as { trackId?: unknown };
      if (typeof data.trackId !== "string" || data.trackId.length === 0) {
        throw new Error(errorsT("api.generic"));
      }
      router.push(`/practice/${data.trackId}?demo=1`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "DATABASE_NOT_READY") {
        toast.info(t("setupRequired"));
        router.push("/setup");
        return;
      }
      toast.error(error instanceof Error ? error.message : errorsT("api.generic"));
    } finally {
      setDemoStarting(false);
    }
  }, [demoStarting, errorsT, router, t]);

  const complete = useCallback(
    (step?: OnboardingStep, reason?: OnboardingCompleteReason) => {
      markOnboardingComplete();
      // The final “Start learning” action is the only guide action that
      // starts a new learning journey. Direct step links remain truthful and
      // navigate to their named destination without unexpectedly seeding Demo.
      if (!hasCompleted && reason === "finish" && step?.id === "review") {
        void startDemo();
      }
    },
    [hasCompleted, markOnboardingComplete, startDemo],
  );

  const skip = useCallback(() => {
    markOnboardingComplete();
  }, [markOnboardingComplete]);

  const steps = [
    { id: "library", title: t("library.title"), description: t("library.description"), href: "/library" },
    { id: "setup", title: t("setup.title"), description: t("setup.description"), href: "/setup" },
    { id: "practice", title: t("practice.title"), description: t("practice.description"), href: "/library" },
    { id: "review", title: t("review.title"), description: t("review.description"), href: "/review" },
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
              <Link href="/library" data-tour="nav-library" className={navLinkClass("/library")} {...navLinkProps("/library")}>{navT("library")}</Link>
              <Link href="/review" data-tour="nav-review" className={`${navLinkClass("/review")} inline-flex items-center gap-1.5`} {...navLinkProps("/review")}>{navT("review")}<NavReviewCount /></Link>
              <Link href="/vault" className={navLinkClass("/vault")} {...navLinkProps("/vault")}>{navT("vault")}</Link>
              <Link href="/dashboard" className={navLinkClass("/dashboard")} {...navLinkProps("/dashboard")}>{navT("analytics")}</Link>
              <Link href="/setup" data-tour="nav-setup" className={navLinkClass("/setup")} {...navLinkProps("/setup")}>{navT("setup")}</Link>
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
                  <Link href="/library" className={`${navLinkClass("/library")} w-full cursor-pointer`} {...navLinkProps("/library")}>{navT("library")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/review" className={`${navLinkClass("/review")} inline-flex w-full cursor-pointer items-center gap-1.5`} {...navLinkProps("/review")}>
                    {navT("review")}
                    <NavReviewCount />
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/vault" className={`${navLinkClass("/vault")} w-full cursor-pointer`} {...navLinkProps("/vault")}>{navT("vault")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className={`${navLinkClass("/dashboard")} w-full cursor-pointer`} {...navLinkProps("/dashboard")}>{navT("analytics")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/setup" className={`${navLinkClass("/setup")} w-full cursor-pointer`} {...navLinkProps("/setup")}>{navT("setup")}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <NavStreak />
            <GuideTrigger
              ref={guideTriggerRef}
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
      <main className="h-[calc(100vh-64px)] overflow-y-auto overflow-x-hidden bg-muted/30">{children}</main>
      <OnboardingGuide
        // Remount when the guide opens so internal step state resets to 0
        // without a reset effect (avoids the react-hooks cascading-render
        // rule). The component returns null when closed.
        key={isGuideOpen ? "onboarding-open" : "onboarding-closed"}
        open={isGuideOpen}
        onOpenChange={(open) => {
          setIsGuideOpen(open);
        }}
        steps={steps}
        onComplete={complete}
        onSkip={skip}
        returnFocusRef={guideTriggerRef}
      />
    </>
  );
}
