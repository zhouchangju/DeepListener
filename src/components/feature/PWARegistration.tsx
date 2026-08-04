"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface DeepListenerBridge {
  onExternalBlocked?: (callback: (payload: { url?: string }) => void) => () => void;
}

export default function PWARegistration() {
  const t = useTranslations("common");

  useEffect(() => {
    // Electron serves the app from http://127.0.0.1 but ships a frozen,
    // standalone bundle. Registering /sw.js there would re-cache stale
    // assets from a prior version and force a surprise `location.reload()`
    // on activation, so skip registration entirely inside Electron. The
    // preload bridge (desktop/preload.js) only exists in that context, so
    // its presence is a reliable Electron detector.
    const bridge = (window as Window & { deepListener?: DeepListenerBridge }).deepListener;
    if (bridge) {
      const unsubscribe = bridge.onExternalBlocked?.(({ url }) => {
        toast.warning(t("externalLinkBlocked"), {
          description: url || t("externalLinkBlockedDetail"),
        });
      });

      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister())),
          )
          .catch((error) => {
            console.warn("Failed to unregister Electron service workers:", error);
          });
      }
      if ("caches" in window) {
        void window.caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith("deeplistener-"))
                .map((key) => window.caches.delete(key)),
            ),
          )
          .catch((error) => {
            console.warn("Failed to clear Electron PWA caches:", error);
          });
      }
      return () => unsubscribe?.();
    }

    if (
      "serviceWorker" in navigator &&
      (window.location.protocol === "http:" || window.location.protocol === "https:")
    ) {
      // Defer registration until after load so it never competes with the
      // first paint for CPU/network.
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // When a new SW takes over, reload once so the user gets the
            // latest app shell instead of a mix of old and new assets.
            if (registration.waiting) {
              registration.waiting.addEventListener("statechange", (event) => {
                if ((event.target as ServiceWorker).state === "activated") {
                  window.location.reload();
                }
              });
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          })
          .catch((err) => {
            // Surface real registration failures (e.g. mixed-content, HTTPS
            // mismatch) as a warning rather than a silent log so they are
            // easier to diagnose. This is not user-facing.
            console.warn("SW registration failed:", err);
          });
      });
    }
  }, [t]);

  return null;
}
