"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardPath } from "@/services/user.service";

function mapLoginError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid_credentials") ||
    m.includes("invalid email or password") ||
    m.includes("wrong password") ||
    m.includes("user not found")
  ) {
    return "login.error.invalidCredentials";
  }
  if (m.includes("email not confirmed")) {
    return "login.error.emailNotConfirmed";
  }
  if (m.includes("banned") || m.includes("disabled") || m.includes("blocked")) {
    return "login.error.accountDisabled";
  }
  if (m.includes("too many") || m.includes("rate limit")) {
    return "login.error.tooManyAttempts";
  }
  return "login.error.unexpected";
}

export async function login(formData: FormData): Promise<{ errorKey: string } | void> {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { errorKey: mapLoginError(error.message) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  revalidatePath("/", "layout");
  redirect(user ? await getDashboardPath(user.id) : "/dashboard");
}

export async function signInWithGoogle() {
  // Delegate to the Route Handler which properly sets PKCE code_verifier cookies
  // on the redirect response. Direct server-action cookie propagation through
  // redirect() is less reliable for PKCE flows.
  redirect("/api/auth/google");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
