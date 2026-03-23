import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDashboardPath } from "@/services/user.service";
import { createAdminClient } from "@/lib/supabase/admin";

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

      // ─── Account-linking: handle email/password user logging in via Google ───
      // Supabase only auto-links a Google identity to an existing email/password
      // account when that account's email is confirmed. If the user registered
      // via our custom OTP flow before we started confirming emails, Supabase
      // may have created a brand-new Google-only account instead of linking.
      // Detect this and fix it transparently.
      if (user) {
        const isLinkRetry = searchParams.get("link") === "1";
        const isGoogleOnly =
          (user.identities ?? []).length > 0 &&
          (user.identities ?? []).every((id) => id.provider === "google");

        if (isGoogleOnly && user.email) {
          const admin = createAdminClient();
          const { data: usersData } = await admin.auth.admin.listUsers({
            perPage: 1000,
          });

          // Find an existing email/password account with the same email
          const existingEmailUser = usersData?.users?.find(
            (u) =>
              u.email === user.email &&
              u.id !== user.id &&
              (u.identities ?? []).some((id) => id.provider === "email")
          );

          if (existingEmailUser) {
            if (isLinkRetry) {
              // Second attempt still produced a separate Google account — Supabase
              // auto-linking is unavailable. Clean up and send user to login.
              await admin.auth.admin.deleteUser(user.id);
              return NextResponse.redirect(
                new URL(
                  `/login?error=${encodeURIComponent(
                    "Không thể liên kết tài khoản tự động. Vui lòng đăng nhập bằng email và mật khẩu."
                  )}`,
                  siteUrl
                )
              );
            }

            // First attempt: delete the brand-new Google-only account (no user
            // data yet), confirm the existing email/password account's email so
            // Supabase will auto-link on the next OAuth pass, then retry.
            await admin.auth.admin.deleteUser(user.id);
            await admin.auth.admin.updateUserById(existingEmailUser.id, {
              email_confirm: true,
            });

            // Redirect through Google OAuth again — this time Supabase will find
            // the confirmed email/password account and link the Google identity.
            // The `link=1` flag prevents an infinite loop if linking still fails.
            return NextResponse.redirect(
              new URL("/api/auth/google?link=1", siteUrl)
            );
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

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
