import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveSiteUrl } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  // Canonical site URL — `NEXT_PUBLIC_SITE_URL` first, dev hosts via
  // `x-forwarded-host` only in non-production, and hard-fail in
  // production if neither is set. See `lib/site-url.ts` for the
  // security rationale.
  let siteUrl: string;
  try {
    siteUrl = resolveSiteUrl(request);
  } catch (err) {
    console.error("[auth/google] resolveSiteUrl failed", err);
    // Without a trusted site URL we can't build a safe redirect target;
    // 500 is the right shape rather than silently falling through to a
    // spoofed host.
    return new NextResponse("Site URL not configured", { status: 500 });
  }

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
