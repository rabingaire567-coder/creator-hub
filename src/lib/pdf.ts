// Client-side helpers for the PDF Library: upload validation, thumbnail
// compression and downloads. Permanent PDF storage always lives on the Convex
// backend — any object URL created here is ephemeral (preview/download only)
// and revoked as soon as it has been used.

/** Product cap; the backend re-validates from the stored file's metadata. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

/** Validates a picked file is a PDF of at most 10 MB (type, size, magic bytes). */
export async function assertPdfFile(file: File): Promise<void> {
  const namedPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name.trim());
  if (!namedPdf) throw new Error("Please choose a PDF file.");
  if (file.size === 0) throw new Error("That file is empty.");
  if (file.size > MAX_PDF_BYTES) {
    throw new Error("PDF files must be 10 MB or smaller.");
  }
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  for (let i = 0; i + 4 <= head.length; i++) {
    if (
      head[i] === 0x25 && // %
      head[i + 1] === 0x50 && // P
      head[i + 2] === 0x44 && // D
      head[i + 3] === 0x46 // F
    ) {
      return;
    }
  }
  throw new Error("That file doesn't look like a PDF.");
}

/** Reads a file as a data URL (used for small images). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

/** Thumbnails must stay small enough for a Convex document (1 MiB cap). */
const MAX_THUMBNAIL_BYTES = 450_000;
const MAX_THUMBNAIL_DIMENSION = 720;

function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

/** Re-encodes a picked image as a compact JPEG data URL (fits a Convex doc). */
export async function compressThumbnail(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      MAX_THUMBNAIL_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image processing is not supported in this browser.");
    for (let pass = 0; pass < 3; pass++) {
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      for (const quality of [0.85, 0.7, 0.55, 0.45]) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrlByteLength(dataUrl) <= MAX_THUMBNAIL_BYTES) return dataUrl;
      }
      width = Math.max(1, Math.round(width * 0.6));
      height = Math.max(1, Math.round(height * 0.6));
    }
    throw new Error("Couldn't compress that image — try a smaller picture.");
  } finally {
    bitmap.close();
  }
}

/**
 * Downloads a PDF from its Convex storage URL. The temporary object URL only
 * exists for the duration of the click — the permanent copy stays in storage.
 */
export async function downloadPdf(url: string, fileName: string): Promise<void> {
  const downloadName = /\.pdf$/i.test(fileName) ? fileName : `${fileName}.pdf`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1_000);
  } catch {
    // Fall back to opening the file directly (browser handles it).
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Human-readable file size for cards, tables and the editor. */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
