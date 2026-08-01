import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // W0 feasibility (AUTH-001): produce a minimal standalone server bundle
  // under `.next/standalone` so the Electron shell can host the Next.js
  // service without the full repository / node_modules. Additive and
  // reversible; `npm run verify` must remain green.
  output: "standalone",
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
