"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMyProfileAction,
  updateMyProfileAction,
  uploadAvatarAction,
} from "@/app/actions/profile.actions";
import type {
  SustainabilityStats,
  UpdateProfileInput,
  User,
} from "@/types/user.types";

export interface UseProfileResult {
  user: User | null;
  stats: SustainabilityStats | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  uploading: boolean;
  refresh: () => Promise<void>;
  update: (input: UpdateProfileInput) => Promise<{ ok: boolean; error: string | null }>;
  uploadAvatar: (file: File) => Promise<{ ok: boolean; error: string | null }>;
}

export function useProfile(): UseProfileResult {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<SustainabilityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    const res = await getMyProfileAction();
    if (res.error) setError(res.error);
    setUser(res.data.user);
    setStats(res.data.stats);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await getMyProfileAction();
      if (!active) return;
      if (res.error) setError(res.error);
      setUser(res.data.user);
      setStats(res.data.stats);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(async (input: UpdateProfileInput) => {
    setSaving(true);
    const res = await updateMyProfileAction(input);
    setSaving(false);
    if (res.data) setUser(res.data);
    if (res.error) {
      setError(res.error);
      return { ok: false, error: res.error };
    }
    return { ok: true, error: null };
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadAvatarAction(fd);
    setUploading(false);
    if (res.error) {
      setError(res.error);
      return { ok: false, error: res.error };
    }
    if (res.url) setUser((u) => (u ? { ...u, avatar_url: res.url } : u));
    return { ok: true, error: null };
  }, []);

  return { user, stats, loading, error, saving, uploading, refresh, update, uploadAvatar };
}
