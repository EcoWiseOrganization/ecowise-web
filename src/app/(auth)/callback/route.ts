import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboardPath } from "@/services/user.service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const dashboardPath = user
        ? await getDashboardPath(user.id)
        : "/dashboard";

      return NextResponse.redirect(`${origin}${dashboardPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
