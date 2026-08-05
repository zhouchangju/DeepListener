"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Global keyboard-shortcuts help.
 *
 * DeepListener has three shortcut surfaces (review, audio player, shadowing)
 * that previously had no discoverable entry point — only ReviewCard exposed
 * a tooltip. This component:
 *   - opens on the `?` key from anywhere (when no input is focused),
 *   - provides a visible trigger button in the nav so users can find it
 *     without knowing the `?` shortcut.
 *
 * Shortcut semantics differ per page (Space / R / N mean different things in
 * review vs practice vs shadowing), so the panel groups them by context.
 */
export default function KeyboardShortcutsHelp() {
  const t = useTranslations("shortcuts");
  const commonT = useTranslations("common");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Ignore when the user is typing, when a modifier is held (so we don't
      // swallow browser shortcuts like Cmd+?), or when a dialog is already
      // open elsewhere.
      const target = event.target as HTMLElement | null;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target?.closest("input, textarea, select, [contenteditable=true], [role=textbox]")
      ) {
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sections: Array<{ title: string; items: Array<{ keys: string; desc: string }> }> = [
    {
      title: t("review.title"),
      items: [
        { keys: "Space", desc: t("review.toggleAnswer") },
        { keys: "R", desc: t("review.playAudio") },
        { keys: "1 / 2 / 3 / 4", desc: t("review.grade") },
      ],
    },
    {
      title: t("practice.title"),
      items: [
        { keys: "Space", desc: t("practice.playPause") },
        { keys: "← / →", desc: t("practice.prevNext") },
        { keys: "L", desc: t("practice.toggleLoop") },
        { keys: "S", desc: t("practice.shadowing") },
        { keys: "Wheel", desc: t("practice.zoom") },
        { keys: "Right-drag", desc: t("practice.pan") },
      ],
    },
    {
      title: t("shadowing.title"),
      items: [
        { keys: "← / →", desc: t("shadowing.prevNext") },
        { keys: "Space", desc: t("shadowing.play") },
        { keys: "R", desc: t("shadowing.playOriginal") },
        { keys: "N", desc: t("shadowing.capture") },
        { keys: "C", desc: t("shadowing.copy") },
        { keys: "Esc", desc: t("shadowing.close") },
      ],
    },
    {
      title: t("global.title"),
      items: [{ keys: "?", desc: t("global.toggleThis") }],
    },
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        title={t("open")}
      >
        <Keyboard className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" closeLabel={commonT("close")}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{section.title}</h3>
                <dl className="space-y-1.5">
                  {section.items.map((item) => (
                    <div key={item.keys} className="flex items-center justify-between gap-3 text-sm">
                      <dt className="text-muted-foreground">{item.desc}</dt>
                      <dd>
                        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                          {item.keys}
                        </kbd>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
