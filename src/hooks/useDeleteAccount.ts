"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMyAccountAction } from "@/app/actions/profile.actions";

export function useDeleteAccount() {
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedOrgIds, setBlockedOrgIds] = useState<string[]>([]);

  const submit = useCallback(async () => {
    setError(null);
    setBlockedOrgIds([]);
    setLoading(true);
    const res = await deleteMyAccountAction({ confirmEmail });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "unknown");
      if (res.blockedOrgIds) setBlockedOrgIds(res.blockedOrgIds);
      return false;
    }
    router.replace("/login");
    return true;
  }, [confirmEmail, router]);

  return {
    confirmEmail,
    setConfirmEmail,
    loading,
    error,
    blockedOrgIds,
    submit,
  };
}
