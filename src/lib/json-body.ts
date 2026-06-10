import "server-only";

/**
 * Read a JSON request body with an explicit size cap.
 *
 * Next.js + Vercel already enforce a platform-level body limit (around
 * 4.5 MB on Hobby / 50 MB on Pro), but that's well above the few KB of
 * structured JSON the public POST endpoints actually accept. This
 * helper lets each route declare its own ceiling so a hostile client
 * can't tie up serverless memory with multi-megabyte JSON blobs.
 *
 * Returns one of:
 *   { ok: true, data }     — body parsed within the limit
 *   { ok: false, reason }  — `tooLarge` | `invalidJson` | `noBody`
 *
 * The check looks at the `Content-Length` header first as a cheap
 * upfront reject; if missing or lying, we still bound the read by
 * comparing the actual text length after the fact.
 */
export async function readJsonBodyWithLimit(
  req: Request,
  maxBytes: number,
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; reason: "tooLarge" | "invalidJson" | "noBody" }
> {
  const declared = req.headers.get("content-length");
  if (declared) {
    const declaredBytes = Number.parseInt(declared, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      return { ok: false, reason: "tooLarge" };
    }
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, reason: "noBody" };
  }

  // `.length` is character count rather than bytes; for the typical
  // ASCII-heavy JSON these limits target it's an acceptable
  // approximation and slightly tighter than a byte count. Anything
  // odd-shaped (lots of multi-byte chars) will fail-safe on the
  // tighter side.
  if (text.length > maxBytes) {
    return { ok: false, reason: "tooLarge" };
  }
  if (!text) {
    return { ok: false, reason: "noBody" };
  }

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "invalidJson" };
  }
}
