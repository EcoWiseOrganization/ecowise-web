import axios from "axios";
import type { ApiResponse, VerifyForgotPasswordOtpResponse } from "@/types/api.types";

const api = axios.create({
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || "Something went wrong";
    return Promise.reject(new Error(message));
  },
);

async function post<T extends ApiResponse>(url: string, body: Record<string, string>): Promise<T> {
  // `withCredentials: true` so the forgot-password reset-token httpOnly
  // cookie set on /verify-otp is sent along with the /reset request.
  const { data } = await api.post<T>(url, body, { withCredentials: true });
  return data;
}

/**
 * Register step 1 — only the user's display name and email cross the wire.
 * Password is collected at the verify step so it never round-trips through
 * sessionStorage or two endpoints.
 */
export function sendRegistrationOtp(name: string, email: string) {
  return post("/api/auth/send-otp", { name, email });
}

/**
 * Register step 2 — confirm the code AND set the account password. The
 * server reads the user's name back from the OTP row, so the client
 * doesn't need to remember it.
 */
export function verifyRegistrationOtp(email: string, otp: string, password: string) {
  return post("/api/auth/verify-otp", { email, otp, password });
}

export function sendForgotPasswordOtp(email: string) {
  return post("/api/auth/forgot-password/send-otp", { email });
}

export function verifyForgotPasswordOtp(email: string, otp: string) {
  return post<VerifyForgotPasswordOtpResponse>("/api/auth/forgot-password/verify-otp", { email, otp });
}

/**
 * The reset token is carried in an HTTP-only cookie set by /verify-otp,
 * so the client doesn't need to (and shouldn't) handle it directly.
 */
export function resetPassword(email: string, password: string) {
  return post("/api/auth/forgot-password/reset", { email, password });
}
