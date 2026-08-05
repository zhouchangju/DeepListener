import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".worktrees/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Desktop Electron shell and disposable spikes are standalone Node/JS,
    // not part of the shared src/ library. They live in their own package
    // (desktop/) with its own tooling; spike dirs are throwaway.
    "desktop/**",
    "desktop-spike/**",
    ".desktop-build/**",
    // Disposable packaging smoke outputs are generated under the workspace
    // and must not be treated as application source by ESLint. Use the
    // `**/`-anchored form so flat config matches them at any depth — a bare
    // `.build-temp-*/**` only matches at the workspace root and silently let
    // stray packaging temp dirs inflate lint runtime from ~8s to ~54s.
    "**/.build-temp-*/**",
    // Markdown is documentation, not lintable source. ESLint still computes a
    // config for every matched file even without a parser, and the repo ships
    // 850+ .md files under docs/ and openspec/, so exclude them wholesale.
    "**/*.md",
    // Generated artifacts and lockfiles have no value to lint.
    "package-lock.json",
    // W0/W2 feasibility spike scripts and one-off probes (not library code).
    "docs/desktop-w0/**",
    "docs/agent-harness/**",
  ]),
]);

export default eslintConfig;
