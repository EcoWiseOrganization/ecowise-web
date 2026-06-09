import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MAX_ATTEMPTS, normaliseEmail } from "@/lib/otp";
import crypto from "crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const email = normaliseEmail(body?.email);
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";

  if (!email || !otp) {
    return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Look up by email only so a wrong OTP still locates the row and lets us
  // increment failed_attempts. The previous query joined on (email, otp)
  // which made every miss invisible to lockout.
  const { data: otpRecord, error: fetchError } = await supabase
    .from("otp_verifications")
    .select("id, otp, expires_at, failed_attempts")
    .eq("email", email)
    .single();

  if (fetchError || !otpRecord) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
  }

  if (otpRecord.failed_attempts >= MAX_ATTEMPTS) {
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json(
      { error: "Too many wrong attempts. Please request a new code." },
      { status: 400 },
    );
  }

  if (otpRecord.otp !== otp) {
    await supabase
      .from("otp_verifications")
      .update({ failed_attempts: otpRecord.failed_attempts + 1 })
      .eq("id", otpRecord.id);
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  // Generate a reset token and store it (valid for 10 minutes)
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Clean up OTP and store reset token
  await supabase.from("otp_verifications").delete().eq("email", email);

  await supabase.from("password_reset_tokens").delete().eq("email", email);
  const { error: tokenError } = await supabase.from("password_reset_tokens").insert({
    email,
    token: resetToken,
    expires_at: resetExpiresAt,
  });

  if (tokenError) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // Set the reset token as an HTTP-only cookie scoped to the reset endpoint
  // so JS (and thus XSS) cannot read it. The cookie is the only way the
  // /reset endpoint identifies the in-progress reset. Replaces the
  // previous response-body token + sessionStorage round-trip.
  const response = NextResponse.json({ success: true });
  response.cookies.set("ecowise.reset_token", resetToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/forgot-password",
    maxAge: 10 * 60, // 10 minutes — matches DB expiry
  });
  return response;
}
