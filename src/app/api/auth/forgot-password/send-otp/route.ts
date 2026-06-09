import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAuthUserExists } from "@/services/user.service";
import { wrapBrand } from "@/lib/emails";
import { generateOtp, normaliseEmail, otpExpiry } from "@/lib/otp";
import { clientIp, consumeAuthRateLimit } from "@/lib/rate-limit";
import nodemailer from "nodemailer";

/**
 * Forgot-password OTP issuance.
 *
 * Always returns `{ success: true }` to the client, regardless of whether
 * the email is registered. The previous version returned 404 with
 * "No account found with this email address" — a textbook enumeration
 * oracle that let anyone probe the database for valid accounts.
 *
 * Internally we still only generate + send a code when the user actually
 * exists; an unknown email is a quiet no-op. Errors during email delivery
 * are logged server-side but never surfaced verbatim, since "send failed"
 * also leaks existence (an unknown email would never reach the send step).
 */
export async function POST(request: Request) {
  const body = await request.json();
  const email = normaliseEmail(body?.email);

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Throttle before we hit listUsers / write rows / send mail. We still
  // return success on the way out (#7 enumeration fix) so a 429 also acts
  // as a soft enumeration signal — but only to a client that's already
  // observably abusing the endpoint, which is fine.
  const ip = clientIp(request);
  const perEmail = await consumeAuthRateLimit(`forgot-otp:email:${email}`, {
    windowSec: 60 * 60,
    max: 3,
  });
  if (!perEmail.ok) {
    // Stay polite — same success shape — so attackers don't get a clean
    // "this email is rate-limited" signal that confirms registration.
    return NextResponse.json({ success: true });
  }
  const perIp = await consumeAuthRateLimit(`forgot-otp:ip:${ip}`, {
    windowSec: 60 * 60,
    max: 10,
  });
  if (!perIp.ok) {
    return NextResponse.json({ success: true });
  }

  try {
    // Paginated lookup — the old single-page `listUsers()` silently
    // missed any user past index 1000.
    const userExists = await checkAuthUserExists(email);
    if (!userExists) {
      // Quiet no-op. Don't write to otp_verifications, don't send mail,
      // don't change response shape — looks identical to the success path
      // to any observer.
      return NextResponse.json({ success: true });
    }

    const otp = generateOtp();
    const expiresAt = otpExpiry();
    const supabase = await createClient();
    await supabase.from("otp_verifications").delete().eq("email", email);
    const { error: insertError } = await supabase
      .from("otp_verifications")
      .insert({ email, otp, expires_at: expiresAt });
    if (insertError) {
      console.error(
        "[forgot-password/send-otp] insert failed",
        insertError,
      );
      return NextResponse.json({ success: true });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    try {
      await transporter.sendMail({
        from: `"EcoWise" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Your EcoWise Password Reset Code",
        html: wrapBrand(`
        <h3 style="color:#155A03;margin-top:0;">Password reset</h3>
        <p>You requested to reset your password. Use the code below within the next 5 minutes:</p>
        <div style="background:#F0FDF4;border:1px solid #DAEDD5;border-radius:12px;padding:20px;text-align:center;margin:18px 0;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1F8505;">${otp}</span>
        </div>
        <p style="color:#AAAAAA;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
      `),
      });
    } catch (mailErr) {
      console.error("[forgot-password/send-otp] sendMail failed", mailErr);
      // Best-effort cleanup, but still return the same success shape so a
      // failed delivery can't be turned into an enumeration signal.
      await supabase.from("otp_verifications").delete().eq("email", email);
    }
  } catch (err) {
    console.error("[forgot-password/send-otp] unexpected error", err);
  }

  return NextResponse.json({ success: true });
}
