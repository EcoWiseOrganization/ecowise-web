/**
 * Discriminated success/error envelope for the public JSON auth routes.
 *
 * The prior shape — `{ success?: boolean; error?: string }` with both
 * fields optional — forced every consumer to guard `if (res.success)`
 * AND `if (res.error)` separately, because the type didn't tell
 * TypeScript that an error response wouldn't also carry `success:
 * true`. Narrowing on the `success` field now does the right thing:
 * inside the `true` branch `error` is gone; inside the `false` branch
 * `error` is required.
 *
 * Generic over the success-side payload so endpoints can return
 * extra fields (e.g. `{ success: true, retryAfterSec: 30 }`) without
 * inventing a new envelope shape.
 */
export type ApiSuccess<T = Record<string, never>> = { success: true } & T;
export interface ApiFailure {
  success: false;
  error: string;
}
export type ApiResponse<T = Record<string, never>> = ApiSuccess<T> | ApiFailure;

/**
 * The forgot-password verify endpoint used to return the reset token in
 * the JSON body so the client could sessionStorage it. The token is now
 * carried in an HTTP-only cookie set by the server, so the success body
 * is just `{ success: true }`.
 */
export type VerifyForgotPasswordOtpResponse = ApiResponse;
