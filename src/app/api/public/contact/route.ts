import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createServiceClient } from "@/lib/supabase/service";
import { consumeContactRateLimit } from "@/lib/rate-limit";
import { readJsonBodyWithLimit } from "@/lib/json-body";
import { isEmail, isHoneypotClean, trimToMax } from "@/lib/validators";
import { writeAuditLog } from "@/services/audit.service";
import { MSG } from "@/lib/messages";

// 16 KB body cap — even with a generous 5 KB message + name/email/subject
// we stay well under. Stops a hostile client from tying up runtime
// memory with multi-MB JSON.
const MAX_BODY_BYTES = 16 * 1024;

/**
 * POST /api/public/contact
 *
 * Public lead-capture endpoint backing the /contact page form.
 * - No auth (BR-08-style guest endpoint).
 * - Honeypot field `website` must be empty (bot trap).
 * - Rate-limited to 5 submissions / 15 minutes / IP.
 * - Persists to "ContactMessages" via service role.
 * - Best-effort email notification to GMAIL_USER.
 */
export async function POST(request: Request) {
  const parsed = await readJsonBodyWithLimit(request, MAX_BODY_BYTES);
  if (!parsed.ok) {
    if (parsed.reason === "tooLarge") {
      return NextResponse.json(
        { error: "BODY_TOO_LARGE" },
        { status: 413 },
      );
    }
    return NextResponse.json({ error: MSG.INVALID_FORMAT }, { status: 400 });
  }
  if (!parsed.data || typeof parsed.data !== "object") {
    return NextResponse.json({ error: MSG.INVALID_FORMAT }, { status: 400 });
  }
  const body = parsed.data as Record<string, unknown>;

  const name = trimToMax(String(body.name ?? ""), 200);
  const email = trimToMax(String(body.email ?? ""), 320);
  const subject = trimToMax(String(body.subject ?? ""), 200);
  const message = trimToMax(String(body.message ?? ""), 5000);
  const honeypot = typeof body.website === "string" ? body.website : null;

  if (!name || !email || !message) {
    return NextResponse.json({ error: MSG.REQUIRED_FIELD }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: MSG.INVALID_FORMAT }, { status: 400 });
  }

  // ── Rate limit (BEFORE honeypot) ─────────────────────────────────────
  //
  // The honeypot path used to return `ok: true` immediately, BEFORE
  // consuming the rate-limit token. That gave bots an unlimited
  // budget to hammer the endpoint as long as they kept the trap field
  // populated — useful for DB connection-pool exhaustion or for
  // probing whether the endpoint exists at all without showing up in
  // /admin/contact-messages.
  //
  // Consuming the bucket first means honeypot-triggering bots get
  // 429-ed after the same N requests as a real client. The
  // "pretend-success" response below still leaks no detection
  // signal, but the cost-per-attempt is now bounded.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const limited = await consumeContactRateLimit(ip);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSec: limited.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 60) } }
    );
  }

  // Honeypot — pretend success to avoid leaking detection logic to bots.
  if (!isHoneypotClean(honeypot)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ── Persist ────────────────────────────────────────────────────────────
  const ua = request.headers.get("user-agent");
  const db = createServiceClient();
  const { data, error } = await db
    .from("ContactMessages")
    .insert({
      name,
      email,
      subject: subject || null,
      message,
      ip_address: ip,
      user_agent: ua,
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[contact] insert failed", error.message);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  await writeAuditLog({
    action: "contact_submitted",
    resourceType: "contact_message",
    resourceId: (data as { id: string }).id,
    newValue: { email, hasSubject: Boolean(subject) },
    ipAddress: ip,
    userAgent: ua,
    actorRole: "guest",
  });

  // ── Best-effort email notification ─────────────────────────────────────
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      await transporter.sendMail({
        from: `"EcoWise Contact" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        replyTo: email,
        subject: `[EcoWise] ${subject || "New contact form submission"}`,
        text: [
          `From: ${name} <${email}>`,
          `IP:   ${ip ?? "-"}`,
          ``,
          message,
        ].join("\n"),
      });
    } catch (mailErr) {
      // Non-fatal — message is already stored.
      console.error("[contact] email failed", mailErr);
    }
  }

  return NextResponse.json({ ok: true });
}
