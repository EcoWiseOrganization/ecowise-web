import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const { email, otp } = await request.json();

  if (!email || !otp) {
    return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: otpRecord, error: fetchError } = await supabase
    .from("otp_verifications")
    .select("*")
    .eq("email", email)
    .eq("otp", otp)
    .single();

  if (fetchError || !otpRecord) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
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

  return NextResponse.json({ success: true, resetToken });
}
