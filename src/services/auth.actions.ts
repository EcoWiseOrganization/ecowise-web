"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardPath } from "@/services/user.service";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
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
