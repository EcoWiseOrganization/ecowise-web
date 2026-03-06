export interface ApiResponse {
  success?: boolean;
  error?: string;
}

export interface VerifyForgotPasswordOtpResponse extends ApiResponse {
  resetToken?: string;
}
