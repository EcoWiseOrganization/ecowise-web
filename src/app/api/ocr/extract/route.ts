import { NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/roles";
import { ocrToSuggestion, runOcr } from "@/services/ocr.service";
import { writeAuditLog } from "@/services/audit.service";
import { consumeAuthRateLimit } from "@/lib/rate-limit";
import { MSG } from "@/lib/messages";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (matches MSG19)

/**
 * POST /api/ocr/extract
 * Body: multipart/form-data with field "file" (image).
 * Returns: { ok: true, provider, suggestion, fields }
 */
export async function POST(req: Request) {
  let userId: string;
  try {
    const ctx = await requireSession();
    userId = ctx.userId;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code }, { status: err.httpStatus });
    }
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  // Per-user rate limit. OCR fans out to Anthropic and burns paid
  // tokens per call; without a cap a logged-in user (or a stolen
  // session) can blast 5 MB images at the API as fast as the runtime
  // allows. 30 calls / hour matches the BR-09 anti-spam intent and
  // leaves plenty of headroom for legitimate batch uploads.
  const rate = await consumeAuthRateLimit(`ocr:user:${userId}`, {
    windowSec: 60 * 60,
    max: 30,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSec: rate.retryAfterSec ?? 60 },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec ?? 60) },
      },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: MSG.INVALID_FORMAT }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: MSG.REQUIRED_FIELD }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: MSG.FILE_TOO_LARGE }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: MSG.INVALID_FORMAT }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  let result;
  try {
    result = await runOcr({ imageBase64: base64, mimeType: file.type });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ocr_failed";
    await writeAuditLog({
      action: "ocr_extract",
      resourceType: "ocr_extract",
      actorUserId: userId,
      status: "failure",
      errorMessage: msg,
    });
    return NextResponse.json({ error: "OCR_PROVIDER_ERROR" }, { status: 502 });
  }

  await writeAuditLog({
    action: "ocr_extract",
    resourceType: "ocr_extract",
    actorUserId: userId,
    // Don't log the raw OCR fields — they carry receipt PII (vendor /
    // amount) and could contain prompt-injected text from a hostile
    // image. Provider + field count is enough for ops debugging.
    newValue: { provider: result.provider, fieldCount: result.fields.length },
  });

  return NextResponse.json({
    ok: true,
    provider: result.provider,
    fields: result.fields,
    suggestion: ocrToSuggestion(result),
  });
}
