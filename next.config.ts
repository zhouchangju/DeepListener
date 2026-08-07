import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // W0 feasibility (AUTH-001): produce a minimal standalone server bundle
  // under `.next/standalone` so the Electron shell can host the Next.js
  // service without the full repository / node_modules. Additive and
  // reversible; `npm run verify` must remain green.
  output: "standalone",
  // Route stored media through the streaming API instead of Next's static
  // public-folder serving. In production the public file list is scanned once
  // at server startup, so media imported at runtime would 404; beforeFiles
  // rewrites run before that filesystem check, keeping dev and prod identical
  // (and reaching the desktop data root via /api/media).
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/uploads/:path*", destination: "/api/media/uploads/:path*" },
        { source: "/videos/:path*", destination: "/api/media/videos/:path*" },
      ],
    };
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
