"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, HelpCircle, ExternalLink, FlaskConical } from "lucide-react";
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
import { ApiError, requireOkResponse } from "@/lib/client-response";
import { toast } from "sonner";
import ConfirmDialog from "@/components/feature/ConfirmDialog";

export type ProviderId = "deepgram" | "openai" | "google";
export type ProviderStatus = "missing" | "unknown" | "unverified" | "verified" | "invalid";

export interface ProviderSummaryClient {
  provider: ProviderId;
  configured: Record<ProviderId, boolean>;
  hasBaseUrl: boolean;
  status?: Record<ProviderId, ProviderStatus>;
}

interface ProviderConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful save so the page can re-read readiness. */
  onSaved: () => void;
  /** Summary fetched server-side to seed the initial selection. */
  initialSummary: ProviderSummaryClient;
}

/**
 * Official console / sign-up URLs for each provider. These are public,
 * well-known entry points (no secrets). If a curated tutorial link should
 * be added later, extend this map in one place.
 */
const PROVIDER_HELP: Record<ProviderId, { consoleUrl: string; stepsKey: "deepgramSteps" | "openaiSteps" | "googleSteps" }> = {
  deepgram: { consoleUrl: "https://console.deepgram.com/", stepsKey: "deepgramSteps" },
  openai: { consoleUrl: "https://platform.openai.com/api-keys", stepsKey: "openaiSteps" },
  google: { consoleUrl: "https://aistudio.google.com/app/apikey", stepsKey: "googleSteps" },
};

const PROVIDERS: { id: ProviderId; label: string; hintKey: "deepgramHint" | "openaiHint" | "googleHint" }[] = [
  { id: "deepgram", label: "Deepgram", hintKey: "deepgramHint" },
  { id: "openai", label: "OpenAI", hintKey: "openaiHint" },
  { id: "google", label: "Google", hintKey: "googleHint" },
];

const PROVIDER_LABELS: Record<ProviderId, string> = {
  deepgram: "Deepgram",
  openai: "OpenAI",
  google: "Google",
};

function deriveStatus(configured: Record<ProviderId, boolean>): Record<ProviderId, ProviderStatus> {
  return {
    deepgram: configured.deepgram ? "unverified" : "missing",
    openai: configured.openai ? "unverified" : "missing",
    google: configured.google ? "unverified" : "missing",
  };
}

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
  // Inline "how to get a key" help panel. Previously the dialog only showed a
  // one-line "get a key from your provider's dashboard" hint, which left
  // non-technical users stuck at the very first step of the install→practice
  // journey the desktop PRD calls out as the #1 friction point.
  const [showHelp, setShowHelp] = useState(false);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testing, setTesting] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [testConsent, setTestConsent] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<Record<ProviderId, ProviderStatus>>(
    initialSummary.status ?? deriveStatus(initialSummary.configured),
  );
  const testFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProvider(initialSummary.provider);
      setApiKey("");
      setBaseUrl("");
      setShowBaseUrl(initialSummary.hasBaseUrl || initialSummary.provider === "openai");
      setShowHelp(false);
      setTestFile(null);
      setTesting(false);
      setTestConsent(false);
      setVerificationStatus(initialSummary.status ?? deriveStatus(initialSummary.configured));
      setRemoveConfirmOpen(false);
      setRemoving(false);
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

  const handleConnectivityTest = async () => {
    if (!testFile || !isConfigured || !testConsent || testing) return;
    setTesting(true);
    try {
      const res = await fetch("/api/setup/provider/test", {
        method: "POST",
        headers: {
          "Content-Type": testFile.type || "application/octet-stream",
          "X-DeepListener-Provider": provider,
          "X-DeepListener-File-Name": encodeURIComponent(testFile.name),
          "X-DeepListener-File-Size": String(testFile.size),
        },
        body: testFile,
      });
      await requireOkResponse(res, t("testFailed"));
      setVerificationStatus((current) => ({ ...current, [provider]: "verified" }));
      toast.success(t("testSuccess", { provider: PROVIDER_LABELS[provider] }));
    } catch (error) {
      setVerificationStatus((current) => ({
        ...current,
        [provider]: error instanceof ApiError && error.code === "PROVIDER_NOT_CONFIGURED" ? "invalid" : "unknown",
      }));
      toast.error(error instanceof Error ? error.message : t("testFailed"));
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    if (!isConfigured || removing) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/setup/provider", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      await requireOkResponse(res, t("removeFailed"));
      toast.success(t("removeSuccess", { provider: PROVIDER_LABELS[provider] }));
      onSaved();
      onClose();
    } catch {
      toast.error(t("removeFailed"));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]" closeLabel={commonT("close")}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <p id="provider-choice-label" className="text-sm font-medium">{t("providerLabel")}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="provider-choice-label" aria-describedby="provider-choice-hint">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  aria-pressed={provider === p.id}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    provider === p.id
                      ? "bg-primary text-white border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p id="provider-choice-hint" className="text-xs text-muted-foreground">
              {t(PROVIDERS.find((p) => p.id === provider)?.hintKey ?? "deepgramHint")}
            </p>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="provider-api-key" className="text-sm font-medium">{t("apiKeyLabel")}</label>
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                aria-expanded={showHelp}
                aria-controls="provider-key-help"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                title={t("howToGetKeyHint")}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                {t("howToGetKey")}
              </button>
            </div>
            <input
              id="provider-api-key"
              type="password"
              autoComplete="off"
              className="w-full p-2.5 text-sm border border-input bg-background rounded-md outline-none focus:ring-2 focus:ring-primary"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isConfigured ? t("configuredPlaceholder") : ""}
              aria-describedby="provider-key-hint"
            />
            {isConfigured ? (
              <p id="provider-key-hint" className="text-xs text-muted-foreground">
                {t("replaceHint")}
              </p>
            ) : (
              <p id="provider-key-hint" className="text-xs text-muted-foreground">
                {t("getKeyHint")}
              </p>
            )}

            {/*
              Inline "how to get a key" help, anchored to the API key field so
              users see it exactly where they get stuck. Shows provider-specific
              steps and a link to the official console so the apply→paste flow
              is one click away instead of a dead end.
            */}
            {showHelp && (
              <div
                id="provider-key-help"
                className="space-y-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3"
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" />
                  {t("howToTitle", { provider: PROVIDER_LABELS[provider] })}
                </p>
                <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                  {t(PROVIDER_HELP[provider].stepsKey)}
                </p>
                <a
                  href={PROVIDER_HELP[provider].consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("openConsole", { provider: PROVIDER_LABELS[provider] })}
                </a>
              </div>
            )}
          </div>

          <div
            className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="text-xs text-muted-foreground">{t("statusLabel")}</span>
            <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
              {t(`status.${verificationStatus[provider]}`)}
            </span>
          </div>

          {isConfigured && (
            <div className="space-y-2 rounded-lg border border-amber-300/50 bg-amber-50/60 p-3 dark:border-amber-400/20 dark:bg-amber-500/10" aria-labelledby="provider-test-title">
              <p id="provider-test-title" className="text-xs font-medium text-foreground">{t("testTitle")}</p>
              <p id="provider-test-disclosure" className="text-xs text-muted-foreground">{t("testDisclosure")}</p>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-input"
                  checked={testConsent}
                  onChange={(event) => setTestConsent(event.target.checked)}
                  aria-describedby="provider-test-disclosure"
                />
                <span>{t("testConsent")}</span>
              </label>
              <input
                ref={testFileInput}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(event) => {
                  setTestFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => testFileInput.current?.click()} disabled={testing}>
                  <FlaskConical className="h-4 w-4" /> {testFile ? testFile.name : t("testChooseSample")}
                </Button>
                <Button type="button" size="sm" onClick={() => void handleConnectivityTest()} disabled={!testFile || !testConsent || testing} aria-busy={testing}>
                  {testing ? <Loader2 className="animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                  {testing ? t("testing") : t("testButton")}
                </Button>
              </div>
            </div>
          )}

          {provider === "openai" && (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setShowBaseUrl((v) => !v)}
                aria-expanded={showBaseUrl}
                aria-controls="provider-base-url-section"
                className="text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {showBaseUrl ? t("hideBaseUrl") : t("useBaseUrl")}
              </button>
              {showBaseUrl && (
                <div id="provider-base-url-section" className="grid gap-2">
                  <label htmlFor="provider-base-url" className="text-sm font-medium">{t("baseUrlLabel")}</label>
                  <input
                    id="provider-base-url"
                    type="url"
                    className="w-full p-2.5 text-sm border border-input bg-background rounded-md outline-none focus:ring-2 focus:ring-primary"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={initialSummary.hasBaseUrl ? t("baseUrlConfiguredPlaceholder") : "https://api.openai.com/v1"}
                    aria-describedby="provider-base-url-hint"
                  />
                  <p id="provider-base-url-hint" className="text-xs text-muted-foreground">
                    {t("baseUrlHint")}
                  </p>
                </div>
              )}

            {isConfigured && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit justify-start px-0 text-red-700 hover:bg-transparent hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
                onClick={() => setRemoveConfirmOpen(true)}
                disabled={loading || testing || removing}
              >
                {removing ? t("removing") : t("removeCredential")}
              </Button>
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
      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={setRemoveConfirmOpen}
        title={t("removeConfirmTitle", { provider: PROVIDER_LABELS[provider] })}
        description={t("removeConfirmDescription")}
        confirmLabel={t("removeCredential")}
        cancelLabel={commonT("cancel")}
        destructive
        onConfirm={() => void handleRemove()}
      />
    </Dialog>
  );
}
