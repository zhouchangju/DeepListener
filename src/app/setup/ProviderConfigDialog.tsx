"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { requireOkResponse } from "@/lib/client-response";
import { toast } from "sonner";

export type ProviderId = "deepgram" | "openai" | "google";

export interface ProviderSummaryClient {
  provider: ProviderId;
  configured: Record<ProviderId, boolean>;
  hasBaseUrl: boolean;
}

interface ProviderConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful save so the page can re-read readiness. */
  onSaved: () => void;
  /** Summary fetched server-side to seed the initial selection. */
  initialSummary: ProviderSummaryClient;
}

const PROVIDERS: { id: ProviderId; label: string; hintKey: "deepgramHint" | "openaiHint" | "googleHint" }[] = [
  { id: "deepgram", label: "Deepgram", hintKey: "deepgramHint" },
  { id: "openai", label: "OpenAI", hintKey: "openaiHint" },
  { id: "google", label: "Google", hintKey: "googleHint" },
];

export default function ProviderConfigDialog({
  isOpen,
  onClose,
  onSaved,
  initialSummary,
}: ProviderConfigDialogProps) {
  const t = useTranslations("setup.providerDialog");
  const commonT = useTranslations("common");
  const [provider, setProvider] = useState<ProviderId>(initialSummary.provider);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showBaseUrl, setShowBaseUrl] = useState(initialSummary.hasBaseUrl);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProvider(initialSummary.provider);
      setApiKey("");
      setBaseUrl("");
      setShowBaseUrl(initialSummary.hasBaseUrl || initialSummary.provider === "openai");
    }
  }, [isOpen, initialSummary]);

  const isConfigured = initialSummary.configured[provider];
  const canSubmit = apiKey.trim().length > 0 && !loading;

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { provider, apiKey: apiKey.trim() };
      // Only send baseUrl when the user opted into showing the field.
      if (provider === "openai" && showBaseUrl && baseUrl.trim()) {
        payload.baseUrl = baseUrl.trim();
      }
      const res = await fetch("/api/setup/provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await requireOkResponse(res, t("saveFailed"));
      toast.success(t("saveSuccess", { provider }));
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t("providerLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    provider === p.id
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t(PROVIDERS.find((p) => p.id === provider)?.hintKey ?? "deepgramHint")}
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">{t("apiKeyLabel")}</label>
            <input
              type="password"
              autoComplete="off"
              className="w-full p-2.5 text-sm border border-input bg-background rounded-md outline-none focus:ring-2 focus:ring-primary"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isConfigured ? t("configuredPlaceholder") : ""}
            />
            {isConfigured ? (
              <p className="text-xs text-muted-foreground">
                {t("replaceHint")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("getKeyHint")}
              </p>
            )}
          </div>

          {provider === "openai" && (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setShowBaseUrl((v) => !v)}
                className="text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {showBaseUrl ? t("hideBaseUrl") : t("useBaseUrl")}
              </button>
              {showBaseUrl && (
                <>
                  <label className="text-sm font-medium">{t("baseUrlLabel")}</label>
                  <input
                    type="url"
                    className="w-full p-2.5 text-sm border border-input bg-background rounded-md outline-none focus:ring-2 focus:ring-primary"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={initialSummary.hasBaseUrl ? t("baseUrlConfiguredPlaceholder") : "https://api.openai.com/v1"}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("baseUrlHint")}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {commonT("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> {t("saving")}
              </>
            ) : (
              commonT("save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
