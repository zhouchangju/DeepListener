/**
 * Resolves chart colors from CSS theme tokens so recharts fills/strokes adapt
 * to light/dark mode automatically. Recharts accepts any CSS color string, so
 * we read the computed value of the oklch token at call time.
 *
 * Keep the semantic names aligned with globals.css `--chart-*` and the status
 * palette in `domain-constants.ts`.
 */

function resolveVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export interface ChartPalette {
  /** Primary brand hue (--chart-1). */
  primary: string;
  /** Success / positive (--chart-2). */
  success: string;
  /** Warning / amber (--chart-3). */
  warning: string;
  /** Purple accent (--chart-4). */
  purple: string;
  /** Danger / rose (--chart-5). */
  danger: string;
  /** Neutral slate for axis/grid lines. */
  grid: string;
  /** Muted text for axis ticks. */
  axis: string;
  /** Faint cursor fill. */
  cursor: string;
}

const FALLBACK_LIGHT: ChartPalette = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  purple: "#8b5cf6",
  danger: "#f43f5e",
  grid: "#f1f5f9",
  axis: "#64748b",
  cursor: "#f1f5f9",
};

/**
 * Returns the active chart palette resolved from CSS variables. Call inside a
 * client effect/event so it reflects the current theme; SSR falls back to the
 * light palette (charts only render client-side via ChartWrapper anyway).
 */
export function getChartPalette(): ChartPalette {
  return {
    primary: resolveVar("--chart-1", FALLBACK_LIGHT.primary),
    success: resolveVar("--chart-2", FALLBACK_LIGHT.success),
    warning: resolveVar("--chart-3", FALLBACK_LIGHT.warning),
    purple: resolveVar("--chart-4", FALLBACK_LIGHT.purple),
    danger: resolveVar("--chart-5", FALLBACK_LIGHT.danger),
    grid: resolveVar("--border", FALLBACK_LIGHT.grid),
    axis: resolveVar("--muted-foreground", FALLBACK_LIGHT.axis),
    cursor: resolveVar("--muted", FALLBACK_LIGHT.cursor),
  };
}

import type { TrackStatus } from "@/lib/domain-constants";

/** Status → semantic color, using stable TrackStatus enum values. */
export function getStatusColor(status: TrackStatus, palette = getChartPalette()): string {
  switch (status) {
    case "UNLEARNT":
      return "#94a3b8";
    case "INTENSIVE":
      return palette.primary;
    case "ANALYSIS":
      return palette.warning;
    case "SHADOWING":
      return palette.purple;
    case "SPEED_SHADOWING":
      return "#db2777";
    case "PARAPHRASE":
      return "#0891b2";
    case "LEARNT":
      return palette.success;
    default:
      return "#94a3b8";
  }
}
