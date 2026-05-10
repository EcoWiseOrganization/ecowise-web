import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createServiceClient } from "@/lib/supabase/service";
import { consumeContactRateLimit } from "@/lib/rate-limit";
import { isEmail, isHoneypotClean, trimToMax } from "@/lib/validators";
import { writeAuditLog } from "@/services/audit.service";
import { MSG } from "@/lib/messages";

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
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: MSG.INVALID_FORMAT }, { status: 400 });
  }

  const name = trimToMax(String(body.name ?? ""), 200);
  const email = trimToMax(String(body.email ?? ""), 320);
  const subject = trimToMax(String(body.subject ?? ""), 200);
  const message = trimToMax(String(body.message ?? ""), 5000);
  const honeypot = body.website;

  if (!name || !email || !message) {
    return NextResponse.json({ error: MSG.REQUIRED_FIELD }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: MSG.INVALID_FORMAT }, { status: 400 });
  }

  // Honeypot — pretend success to avoid leaking detection logic to bots.
  if (!isHoneypotClean(honeypot)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ── Rate limit ─────────────────────────────────────────────────────────
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
