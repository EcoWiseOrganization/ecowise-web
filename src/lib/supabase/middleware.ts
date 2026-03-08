import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/register", "/register/verify", "/register/success"];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.includes(pathname);
}

function isProtectedRoute(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
}

async function getIsAdmin(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
) {
  const { data } = await supabase
    .from("User")
    .select("is_admin")
    .eq("id", userId)
    .single();

  return data?.is_admin === true;
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
    const isAdmin = await getIsAdmin(supabase, user.id);
    url.pathname = isAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Role-based routing for protected routes
  if (user && isProtectedRoute(pathname)) {
    const isAdmin = await getIsAdmin(supabase, user.id);

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
