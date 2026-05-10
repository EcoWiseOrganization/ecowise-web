import { NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/roles";
import { ocrToSuggestion, runOcr } from "@/services/ocr.service";
import { writeAuditLog } from "@/services/audit.service";
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
      resourceType: "user",
      resourceId: userId,
      actorUserId: userId,
      status: "failure",
      errorMessage: msg,
    });
    return NextResponse.json({ error: "OCR_PROVIDER_ERROR" }, { status: 502 });
  }

  await writeAuditLog({
    action: "ocr_extract",
    resourceType: "user",
    resourceId: userId,
    actorUserId: userId,
    newValue: { provider: result.provider, fields: result.fields.length },
  });

  return NextResponse.json({
    ok: true,
    provider: result.provider,
    fields: result.fields,
    suggestion: ocrToSuggestion(result),
  });
}
