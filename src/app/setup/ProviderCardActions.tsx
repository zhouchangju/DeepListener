"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import ProviderConfigDialog, { type ProviderSummaryClient } from "./ProviderConfigDialog";

interface ProviderCardActionsProps {
  summary: ProviderSummaryClient;
}

/**
 * Client-side actions attached to the provider readiness card. Keeps the
 * surrounding `/setup` page a server component while owning the dialog open
 * state. After a successful save we call `router.refresh()` so the readiness
 * checks re-run server-side and the card reflects the new configured state.
 */
export default function ProviderCardActions({ summary }: ProviderCardActionsProps) {
  const t = useTranslations("setup.providerDialog");
  const [open, setOpen] = useState(false);
  const configureButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    const openFromProviderHash = () => {
      if (window.location.hash === "#provider-settings") {
        setOpen(true);
      }
    };

    // The decision guide uses this stable deep link. Open the real dialog as
    // soon as the card mounts, and also support clicking the link while the
    // user is already on Setup without requiring a second configuration click.
    openFromProviderHash();
    window.addEventListener("hashchange", openFromProviderHash);
    return () => window.removeEventListener("hashchange", openFromProviderHash);
  }, []);

  const closeDialog = () => {
    setOpen(false);
    // The dialog is opened from a hash/deep-link as well as from this button,
    // so Radix cannot always restore focus to a trigger automatically. Keep
    // keyboard users anchored on the stable configuration entry point.
    window.requestAnimationFrame(() => configureButtonRef.current?.focus());
    if (window.location.hash === "#provider-settings") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  };

  return (
    <>
      <Button ref={configureButtonRef} variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" /> {t("configure")}
      </Button>
      <ProviderConfigDialog
        isOpen={open}
        onClose={closeDialog}
        onSaved={() => router.refresh()}
        initialSummary={summary}
      />
    </>
  );
}
