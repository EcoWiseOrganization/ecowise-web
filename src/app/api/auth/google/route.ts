import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Determine the canonical public URL for the redirect target.
  // Priority:
  //   1. NEXT_PUBLIC_SITE_URL  (set manually in env — most reliable)
  //   2. x-forwarded-host header (set by Vercel / reverse proxies)
  //   3. Fallback to request origin
  // NOTE: Do NOT use VERCEL_URL — it resolves to the deployment-specific
  // *.vercel.app URL which may differ from your custom domain.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (request.headers.get("x-forwarded-host")
      ? `https://${request.headers.get("x-forwarded-host")}`
      : null) ??
    new URL(request.url).origin;

  const cookiesToSet: {
    name: string;
    value: string;
    options: Record<string, unknown>;
  }[] = [];

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

  // Forward the `link=1` flag through the OAuth round-trip so the callback
  // can detect a second attempt (account-linking retry) and avoid infinite loops.
  const isLinkingRetry = new URL(request.url).searchParams.get("link") === "1";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/callback${isLinkingRetry ? "?link=1" : ""}`,
    },
  });

  if (error || !data.url) {
    const errorMsg = error?.message ?? "OAuth initiation failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, siteUrl)
    );
  }

  // Redirect to Google — include any PKCE code_verifier cookies Supabase set,
  // so the browser carries them through the OAuth round-trip back to /callback.
  const response = NextResponse.redirect(data.url);
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(
      name,
      value,
      options as Parameters<typeof response.cookies.set>[2]
    );
  });

  return response;
}
