/**
 * Header-safe filename sanitization for `Content-Disposition` and similar
 * HTTP header values that incorporate user-controlled strings.
 *
 * Why: export routes build download filenames from user input (track type,
 * vault tags, etc.). Without sanitization, a tag or type containing a double
 * quote, backslash, or CR/LF can break the header or inject additional header
 * fields (HTTP response splitting). This helper collapses anything that is
 * not a print-safe path character into a hyphen and trims the result, so the
 * output is always safe to embed inside `filename="..."`.
 *
 * This is an OUTPUT-boundary concern: the input schema still accepts the full
 * range of legitimate free text (titles/sentences legitimately contain quotes
 * and slashes); only the narrow path that flows into an HTTP header is
 * constrained here.
 */

/** Characters that are never safe in a Content-Disposition filename token. */
const UNSAFE_FILENAME_CHARS = /["\\\r\n/<>|:*?\u0000-\u001f]/g;

/**
 * Sanitize an arbitrary string for safe use inside an HTTP header filename.
 * Returns a trimmed, non-empty string; falls back to `fallback` when the input
 * collapses to nothing (e.g. it was entirely unsafe characters).
 */
export function toSafeHeaderFilename(input: string, fallback = "export"): string {
  const cleaned = input
    .replace(UNSAFE_FILENAME_CHARS, "-")
    .replace(/-+/g, "-") // collapse runs of separators
    .replace(/-\./g, ".") // tidy "file-.txt" → "file.txt"
    .replace(/\.-/g, ".") // tidy "file.-ext" → "file.ext"
    .replace(/^-|-$/g, "") // trim leading/trailing separator
    .trim();
  return cleaned.length > 0 ? cleaned : fallback;
}
