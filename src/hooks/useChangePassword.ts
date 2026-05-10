"use client";

import { useState, useCallback } from "react";
import { changePasswordAction } from "@/app/actions/profile.actions";
import { isValidPasswordPolicy } from "@/lib/profile";
import { MSG } from "@/lib/messages";

export function useChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = useCallback(async () => {
    setError(null);
    setSuccess(false);

    if (!oldPassword) {
      setError(MSG.REQUIRED_FIELD);
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError(MSG.PASSWORD_MISMATCH);
      return false;
    }
    if (!isValidPasswordPolicy(newPassword)) {
      setError(MSG.PASSWORD_POLICY);
      return false;
    }

    setLoading(true);
    const res = await changePasswordAction({ oldPassword, newPassword, confirmPassword });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "unknown");
      return false;
    }
    setSuccess(true);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    return true;
  }, [oldPassword, newPassword, confirmPassword]);

  return {
    oldPassword,
    newPassword,
    confirmPassword,
    setOldPassword,
    setNewPassword,
    setConfirmPassword,
    loading,
    error,
    success,
    submit,
  };
}
