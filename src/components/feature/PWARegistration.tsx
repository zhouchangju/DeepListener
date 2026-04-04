"use client";

import { useEffect } from "react";

export default function PWARegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => console.log("SW registered"))
          .catch((err) => console.log("SW registration failed", err));
      });
    }
  }, []);

  return null;
}
