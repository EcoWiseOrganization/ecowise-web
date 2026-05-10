"use client";

/**
 * Convert a base64 payload returned from a server action into a browser
 * download. Pure client helper.
 */
export function triggerBase64Download(opts: {
  base64: string;
  filename: string;
  mimeType: string;
}) {
  const bytes = Uint8Array.from(atob(opts.base64), (c) => c.charCodeAt(0));
  const blob = new Blob([new Uint8Array(bytes)], { type: opts.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
