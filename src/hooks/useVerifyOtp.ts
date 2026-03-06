"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyRegistrationOtp } from "@/services/auth.service";

export function useVerifyOtp() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("register_email");
    if (!stored) {
      router.replace("/register");
      return;
    }
    setEmail(stored);
  }, [router]);

  const handleConfirm = async () => {
    const code = otp.join("");
    if (code.length !== 4) {
      setError("Please enter the 4-digit code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const name = sessionStorage.getItem("register_name") || "";
      const password = sessionStorage.getItem("register_password") || "";

      await verifyRegistrationOtp(email, code, name, password);

      sessionStorage.removeItem("register_name");
      sessionStorage.removeItem("register_email");
      sessionStorage.removeItem("register_password");

      router.push("/register/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setLoading(false);
    }
  };

  return { otp, setOtp, error, loading, email, handleConfirm };
}
