import fs from "node:fs";
import path from "node:path";
import { resolveStoredUploadPath } from "./upload-policy";

export type ExportSourceIssueReason = "invalid-url" | "missing-file";

export interface ExportSourceCandidate {
  label: string;
  audioUrl: string;
}

export interface ExportSourceIssue extends ExportSourceCandidate {
  reason: ExportSourceIssueReason;
}

export type ExportSourceResolution =
  | { audioPath: string }
  | { issue: ExportSourceIssue };

function resolveBundledDemoPath(audioUrl: string, rootDir = process.cwd()): string | null {
  if (!audioUrl.startsWith("/demo/") && !audioUrl.startsWith("demo/")) return null;

  const normalizedUrl = audioUrl.startsWith("/") ? audioUrl.slice(1) : audioUrl;
  const relative = normalizedUrl.replace(/^demo\//, "");
  if (relative.includes("..") || relative.includes("\\") || relative.includes("\0")) return null;

  const demoDir = path.resolve(rootDir, "public", "demo");
  const resolvedPath = path.resolve(demoDir, relative);
  return resolvedPath.startsWith(`${demoDir}${path.sep}`) ? resolvedPath : null;
}

export function resolveExportSource(
  candidate: ExportSourceCandidate,
  exists: (path: string) => boolean = fs.existsSync,
): ExportSourceResolution {
  const audioPath = resolveStoredUploadPath(candidate.audioUrl) ?? resolveBundledDemoPath(candidate.audioUrl);

  if (!audioPath) {
    return {
      issue: {
        ...candidate,
        reason: "invalid-url",
      },
    };
  }

  if (!exists(audioPath)) {
    return {
      issue: {
        ...candidate,
        reason: "missing-file",
      },
    };
  }

  return { audioPath };
}

export function formatIncompleteExportMessage(
  itemKind: string,
  totalItems: number,
  issues: ExportSourceIssue[],
): string {
  const sourceText = issues.length === 1 ? "source is" : "sources are";
  return `Cannot export ${totalItems} ${itemKind} because ${issues.length} selected audio ${sourceText} unavailable or invalid. Fix the upload record or remove the affected selection and try again.`;
}
