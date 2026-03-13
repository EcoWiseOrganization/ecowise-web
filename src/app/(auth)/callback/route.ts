import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDashboardPath } from "@/services/user.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  // Handle errors sent back by the OAuth provider / Supabase
  const oauthError = searchParams.get("error");
  const oauthErrorDesc = searchParams.get("error_description");

  // Determine the base URL for redirects, respecting reverse proxies (Vercel, etc.)
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (request.headers.get("x-forwarded-host")
      ? `https://${request.headers.get("x-forwarded-host")}`
      : null) ??
    new URL(request.url).origin;

  // If the OAuth provider returned an error, surface it
  if (oauthError) {
    const msg = oauthErrorDesc ?? oauthError;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, siteUrl)
    );
  }

  if (code) {
    // Collect cookies that Supabase wants to set (session tokens, clears code_verifier, etc.)
    const cookiesToSet: {
      name: string;
      value: string;
      options: Record<string, unknown>;
    }[] = [];

    // Use createServerClient directly with request cookies so we read the PKCE
    // code_verifier from the incoming request AND can attach the resulting session
    // cookies directly onto the redirect response.
    // NOTE: Do NOT use createClient() here — it uses next/headers cookies() whose
    // set() calls do NOT automatically propagate to a new NextResponse.redirect().
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookies) {
            cookiesToSet.push(...cookies);
          },
        },
      }
    );

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const dashboardPath = user
        ? await getDashboardPath(user.id)
        : "/dashboard";

      const response = NextResponse.redirect(
        new URL(dashboardPath, siteUrl)
      );

      // Attach all session cookies to the redirect response so the browser
      // stores them before it follows the redirect to the dashboard.
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(
          name,
          value,
          options as Parameters<typeof response.cookies.set>[2]
        );
      });

      return response;
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth-code-error", siteUrl)
  );
}
