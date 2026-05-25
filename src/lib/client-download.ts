export function getFilenameFromContentDisposition(
  contentDisposition: string | null,
  fallbackName: string
) {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1]?.trim();

  if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return fallbackName;
  }

  return filename;
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
