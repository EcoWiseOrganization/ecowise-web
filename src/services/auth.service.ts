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
  const { data } = await api.post<T>(url, body);
  return data;
}

export function sendRegistrationOtp(name: string, email: string, password: string) {
  return post("/api/auth/send-otp", { name, email, password });
}

export function verifyRegistrationOtp(email: string, otp: string, name: string, password: string) {
  return post("/api/auth/verify-otp", { email, otp, name, password });
}

export function sendForgotPasswordOtp(email: string) {
  return post("/api/auth/forgot-password/send-otp", { email });
}

export function verifyForgotPasswordOtp(email: string, otp: string) {
  return post<VerifyForgotPasswordOtpResponse>("/api/auth/forgot-password/verify-otp", { email, otp });
}

export function resetPassword(email: string, password: string, resetToken: string) {
  return post("/api/auth/forgot-password/reset", { email, password, resetToken });
}
