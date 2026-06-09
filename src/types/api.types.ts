export interface ApiResponse {
  success?: boolean;
  error?: string;
}

/**
 * The forgot-password verify endpoint used to return the reset token in
 * the JSON body so the client could sessionStorage it. The token is now
 * carried in an HTTP-only cookie set by the server, so the response body
 * is just `{ success: true }`.
 */
export type VerifyForgotPasswordOtpResponse = ApiResponse;
