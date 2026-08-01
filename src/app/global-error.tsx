"use client";

import { useEffect, useMemo } from "react";

/**
 * Minimal inline locale detection for global-error.tsx, which runs outside
 * the NextIntlClientProvider. Resolution order:
 * 1. NEXT_LOCALE cookie value (if valid)
 * 2. navigator.language
 * 3. "en" fallback
 */
const messages = {
  en: {
    title: "Application error",
    description: "A critical error occurred. Please reload the page.",
    reload: "Reload",
  },
  "zh-CN": {
    title: "应用错误",
    description: "发生了严重错误。请重新加载页面。",
    reload: "重新加载",
  },
} as const;

function detectLocale(): "en" | "zh-CN" {
  if (typeof document === "undefined") return "en";

  // Check cookie
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]*)/);
  if (match?.[1] === "zh-CN") return "zh-CN";
  if (match?.[1] === "en") return "en";

  // Check navigator
  if (typeof navigator !== "undefined") {
    const lang = navigator.language?.toLowerCase() || "";
    if (lang === "zh-cn" || lang === "zh" || lang.startsWith("zh-")) return "zh-CN";
  }

  return "en";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useMemo(() => detectLocale(), []);
  const m = messages[locale];

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={locale}>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{m.title}</h1>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          {m.description}
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {m.reload}
        </button>
      </body>
    </html>
  );
}
