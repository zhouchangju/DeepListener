export function getFilenameFromContentDisposition(
  contentDisposition: string | null,
  fallbackName: string
) {
  const filename = readEncodedFilename(contentDisposition) ?? readPlainFilename(contentDisposition);

  if (!filename || isUnsafeDownloadFilename(filename)) {
    return fallbackName;
  }

  return filename;
}

function readEncodedFilename(contentDisposition: string | null) {
  const value = contentDisposition?.match(/(?:^|;)\s*filename\*\s*=\s*([^;]+)/i)?.[1];
  if (!value) {
    return null;
  }

  const trimmedValue = stripQuotes(value.trim());
  const encodedFilename = trimmedValue.match(/^[^']*'[^']*'(.*)$/)?.[1] ?? trimmedValue;

  try {
    return decodeURIComponent(encodedFilename).trim();
  } catch {
    return null;
  }
}

function readPlainFilename(contentDisposition: string | null) {
  const match = contentDisposition?.match(/(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]*))/i);
  return (match?.[1] ?? match?.[2])?.trim() ?? null;
}

function stripQuotes(value: string) {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

function isUnsafeDownloadFilename(filename: string) {
  return (
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("..") ||
    /[\u0000-\u001f\u007f]/.test(filename)
  );
}

export async function downloadResponseBlob(response: Response, fallbackName: string) {
  const filename = getFilenameFromContentDisposition(
    response.headers.get("Content-Disposition"),
    fallbackName
  );
  const blob = await response.blob();
  downloadBlob(blob, filename);
}

export async function downloadTextResponse(response: Response, fallbackName: string) {
  const filename = getFilenameFromContentDisposition(
    response.headers.get("Content-Disposition"),
    fallbackName
  );
  const text = await response.text();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
