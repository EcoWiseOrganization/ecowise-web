interface ApiResponse {
  success?: boolean;
  error?: string;
}

interface VerifyForgotPasswordOtpResponse extends ApiResponse {
  resetToken?: string;
}

async function post<T extends ApiResponse>(url: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: T = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

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
