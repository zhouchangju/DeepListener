"use client";

import { useEffect } from "react";

export default function PWARegistration() {
  useEffect(() => {
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
  }, []);

  return null;
}
