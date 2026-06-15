"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  // The Supabase browser client touches `localStorage` and `window` during
  // construction. Building it at module scope (the previous behaviour)
  // ran that during import — fine in a "use client" boundary, broken
  // the moment any transitive import pulled this file into a Server
  // Component tree. Defer construction to the hook body so SSR can
  // import the module without exploding.
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // System-admin flag from public.User.is_admin (not present in the auth
  // JWT). Used to route admins to /admin instead of /dashboard.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Get initial session (from cookie, no network call)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Resolve the system-admin flag whenever the signed-in user changes. This
  // is a single PK lookup gated by RLS (a user can only read their own row),
  // so a non-admin can't spoof their way to the admin dashboard — the /admin
  // segment re-checks server-side regardless.
  useEffect(() => {
    if (!user) {
      // Reset on sign-out so a returning guest never inherits the prior
      // user's admin flag. Intentional sync setState (not a render loop).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAdmin(false);
      return;
    }
    let active = true;
    supabase
      .from("User")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsAdmin((data as { is_admin: boolean } | null)?.is_admin === true);
      });
    return () => {
      active = false;
    };
  }, [supabase, user]);

  const dashboardPath = isAdmin ? "/admin" : "/dashboard";

  return { user, loading, isAdmin, dashboardPath };
}
