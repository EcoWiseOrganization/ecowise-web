import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsGoogleOnlyAccount } from "@/services/user.service";
import { randomAvatarUrl } from "@/lib/avatar";
import { MAX_ATTEMPTS, normaliseEmail } from "@/lib/otp";

/**
 * Register step 2 — confirm OTP and set password.
 *
 * The user supplies (email, otp, password). The user's display name is
 * read from the OTP row server-side — the client never has to round-trip
 * it back, and (more importantly) the password never sat in sessionStorage
 * between the two steps.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const email = normaliseEmail(body?.email);
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !otp || !password) {
    return NextResponse.json(
      { error: "Email, code and password are required" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Look up by email only so a wrong OTP still locates the row and lets
  // us increment failed_attempts.
  const { data: otpRecord, error: fetchError } = await supabase
    .from("otp_verifications")
    .select("id, otp, expires_at, failed_attempts, name")
    .eq("email", email)
    .single();

  if (fetchError || !otpRecord) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json(
      { error: "Verification code has expired. Please request a new one." },
      { status: 400 },
    );
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

  // OTP is valid — double-check for Google-only account before creating user
  const isGoogleOnly = await checkIsGoogleOnlyAccount(email);
  if (isGoogleOnly) {
    await supabase.from("otp_verifications").delete().eq("email", email);
    return NextResponse.json({ error: "GOOGLE_ACCOUNT_ONLY" }, { status: 400 });
  }

  const name = (otpRecord.name ?? "").trim() || email.split("@")[0];

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

  if (signUpData.user?.identities && signUpData.user.identities.length === 0) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 400 },
    );
  }

  if (signUpData.user?.id) {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(signUpData.user.id, {
      email_confirm: true,
    });

    // Seed a random default avatar so the profile screen isn't a blank
    // placeholder until the user uploads their own. Failure is logged and
    // ignored — the UI falls back to the initial-letter placeholder.
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

  await supabase.from("otp_verifications").delete().eq("email", email);

  return NextResponse.json({ success: true });
}
