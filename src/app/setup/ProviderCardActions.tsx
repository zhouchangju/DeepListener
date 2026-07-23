"use client";

import { useState } from "react";
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
  const router = useRouter();

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" /> {t("configure")}
      </Button>
      <ProviderConfigDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onSaved={() => router.refresh()}
        initialSummary={summary}
      />
    </>
  );
}
