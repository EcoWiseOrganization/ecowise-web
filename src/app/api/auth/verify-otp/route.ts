import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsGoogleOnlyAccount } from "@/services/user.service";
import { randomAvatarUrl } from "@/lib/avatar";
import { MAX_ATTEMPTS, normaliseEmail } from "@/lib/otp";

export async function POST(request: Request) {
  const body = await request.json();
  const email = normaliseEmail(body?.email);
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !otp || !name || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Look up by email only so a wrong OTP still locates the row and lets
  // us increment failed_attempts. Looking up by (email, otp) like the
  // previous version did meant every wrong guess was just a miss and the
  // attacker could keep brute-forcing the full 4-digit (now 6-digit) space.
  const { data: otpRecord, error: fetchError } = await supabase
    .from("otp_verifications")
    .select("id, otp, expires_at, failed_attempts")
    .eq("email", email)
    .single();

  if (fetchError || !otpRecord) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  // Expired → clean up and surface the same generic code so we don't leak
  // which step failed (timing-wise an attacker could still tell, but the
  // message stays consistent).
  if (new Date(otpRecord.expires_at) < new Date()) {
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
  }

  // Lockout: once a row has accumulated `MAX_ATTEMPTS` misses we delete it
  // so the user must request a new code. The attacker has to go through
  // /send-otp (rate-limited separately) to retry, capping brute-force at
  // MAX_ATTEMPTS per code-window.
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

  // OTP is valid — double-check for Google-only account before creating user
  const isGoogleOnly = await checkIsGoogleOnlyAccount(email);
  if (isGoogleOnly) {
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "GOOGLE_ACCOUNT_ONLY" }, { status: 400 });
  }

  // Create the Supabase user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });

  if (signUpError) {
    const msg = signUpError.message.toLowerCase().includes("already registered")
      ? "An account with this email already exists. Please sign in instead."
      : signUpError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Check for duplicate email (empty identities)
  if (signUpData.user?.identities && signUpData.user.identities.length === 0) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
  }

  // Confirm the user's email via admin so Supabase treats it as verified.
  // This is required for Google OAuth auto-linking to work:
  // Supabase only links a Google identity to an existing account when
  // that account's email is confirmed.
  if (signUpData.user?.id) {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(signUpData.user.id, {
      email_confirm: true,
    });

    // Seed a random default avatar so the profile screen isn't a blank
    // placeholder until the user uploads their own. We swallow the error
    // because failing to set an avatar shouldn't block account creation —
    // the UI falls back to the initial-letter placeholder.
    const avatarUrl = randomAvatarUrl(name);
    const { error: avatarError } = await admin
      .from("User")
      .update({ avatar_url: avatarUrl })
      .eq("id", signUpData.user.id);
    if (avatarError) {
      console.warn(
        "[verify-otp] failed to seed avatar_url for new user",
        signUpData.user.id,
        avatarError.message,
      );
    }
  }

  // Clean up OTP record
  await supabase.from("otp_verifications").delete().eq("email", email);

  return NextResponse.json({ success: true });
}
