import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/register", "/register/verify", "/register/success"];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.includes(pathname);
}

function isProtectedRoute(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
}

// ── is_admin cache ────────────────────────────────────────────────────────
//
// Middleware fires on every protected request. Previously it queried
// `User.is_admin` from Supabase on every call — one extra DB round trip
// per page navigation, which adds up fast at scale.
//
// We now cache the answer in an HMAC-signed cookie keyed to the user id.
// The cookie is only a *routing hint*: the actual admin gate inside
// `/admin/layout.tsx` (added in REVIEW.md high #7) still calls
// `requireSystemAdmin()` against the DB, so spoofing the cookie can at
// worst cause an extra redirect — never escalate privilege.
//
// TTL is short (5 min) so role changes propagate quickly. The signing
// key falls back to the service-role key when `ROLE_CACHE_SECRET` isn't
// set; if neither is available we just skip the cache and do the DB
// hit, preserving the previous behaviour.

const ROLE_CACHE_COOKIE = "ecowise.role";
const ROLE_CACHE_TTL_SEC = 5 * 60;

function getCacheSecret(): string | null {
  return (
    process.env.ROLE_CACHE_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    null
  );
}

function b64UrlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64UrlDecode(input: string): Uint8Array {
  const norm = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (norm.length % 4)) % 4);
  const bin = atob(norm + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return b64UrlEncode(new Uint8Array(sig));
}

interface RoleCachePayload {
  uid: string;
  isAdmin: boolean;
  exp: number;
}

async function signCache(payload: RoleCachePayload): Promise<string | null> {
  const secret = getCacheSecret();
  if (!secret) return null;
  const body = b64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

async function readCache(
  cookieValue: string,
  expectedUserId: string,
): Promise<boolean | null> {
  const secret = getCacheSecret();
  if (!secret) return null;
  const [body, sig] = cookieValue.split(".");
  if (!body || !sig) return null;
  let expected: string;
  try {
    expected = await hmac(secret, body);
  } catch {
    return null;
  }
  if (expected !== sig) return null;
  let payload: RoleCachePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64UrlDecode(body)));
  } catch {
    return null;
  }
  if (payload.uid !== expectedUserId) return null;
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000))
    return null;
  return Boolean(payload.isAdmin);
}

async function resolveIsAdmin(
  supabase: ReturnType<typeof createServerClient>,
  request: NextRequest,
  response: NextResponse,
  userId: string,
): Promise<boolean> {
  const cached = request.cookies.get(ROLE_CACHE_COOKIE)?.value;
  if (cached) {
    const hit = await readCache(cached, userId);
    if (hit !== null) return hit;
  }
  const { data } = await supabase
    .from("User")
    .select("is_admin")
    .eq("id", userId)
    .single();
  const isAdmin = data?.is_admin === true;
  const signed = await signCache({
    uid: userId,
    isAdmin,
    exp: Math.floor(Date.now() / 1000) + ROLE_CACHE_TTL_SEC,
  });
  if (signed) {
    response.cookies.set(ROLE_CACHE_COOKIE, signed, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ROLE_CACHE_TTL_SEC,
      path: "/",
    });
  }
  return isAdmin;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Unauthenticated users trying to access protected routes → login
  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated users trying to access auth pages → dashboard
  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    const redirectResponse = NextResponse.redirect(url);
    const isAdmin = await resolveIsAdmin(supabase, request, redirectResponse, user.id);
    url.pathname = isAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(url, redirectResponse);
  }

  // Role-based routing for protected routes
  if (user && isProtectedRoute(pathname)) {
    const isAdmin = await resolveIsAdmin(supabase, request, supabaseResponse, user.id);

    // Admin on user routes → redirect to admin dashboard
    if (isAdmin && pathname.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    // Non-admin on admin routes → redirect to user dashboard
    if (!isAdmin && pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
