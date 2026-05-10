"use client";

/**
 * Lightweight QR-code renderer that defers to the public `quickchart.io`
 * endpoint as an `<img src=...>`. We don't ship a JS QR library because the
 * builder page is small and infrequently used.
 *
 * Note: the URL is constructed deterministically from the value prop.
 */
export function QrCode({
  value,
  size = 192,
  alt,
}: {
  value: string;
  size?: number;
  alt?: string;
}) {
  const src = `https://quickchart.io/qr?text=${encodeURIComponent(
    value
  )}&size=${size}&margin=2`;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt ?? "QR code"}
      width={size}
      height={size}
      loading="lazy"
      className="rounded-lg border border-[#DAEDD5] bg-white"
    />
  );
}
