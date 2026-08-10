/**
 * API errors.
 *
 * The backend returns one shape for every error (core/exceptions/handler.py):
 *
 *   { "error": { "code": "validation_error", "detail": { ... } } }
 *
 * ApiError unwraps that so callers never parse response bodies by hand, and
 * so a field error can be attached to the right input without string
 * matching on a message.
 */

/** Field name -> messages, as DRF returns them. */
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;

  constructor(message: string, status: number, code: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }

  /**
   * Per-field messages, for attaching to form inputs.
   *
   * DRF nests these under `detail` when a serializer rejects input:
   *   { error: { code: "validation_error",
   *              detail: { email: ["Already registered."] } } }
   *
   * Returns {} when the error is not field-shaped, so a caller can always
   * spread it without checking.
   */
  get fieldErrors(): FieldErrors {
    if (!this.detail || typeof this.detail !== "object") return {};

    const out: FieldErrors = {};
    for (const [key, value] of Object.entries(this.detail as Record<string, unknown>)) {
      // Neither of these names a field.
      //
      // `detail` is a bare message; `non_field_errors` is what DRF uses for
      // a serializer-level failure — a wrong password comes back under it.
      // Treating either as a field error means a form tries to attach the
      // message to an input that does not exist, and the user sees nothing.
      // Both belong to formError instead.
      if (key === "detail" || key === "non_field_errors") continue;
      if (Array.isArray(value)) {
        out[key] = value.map(String);
      } else if (typeof value === "string") {
        out[key] = [value];
      }
    }
    return out;
  }

  /**
   * The message to show above a form, when the failure is not about one
   * field. Falls back to something honest rather than leaking a stack.
   */
  get formError(): string {
    if (this.detail && typeof this.detail === "object") {
      const d = (this.detail as Record<string, unknown>).detail;
      if (typeof d === "string") return d;
      // DRF sometimes returns non_field_errors for serializer-level failures.
      const nfe = (this.detail as Record<string, unknown>).non_field_errors;
      if (Array.isArray(nfe) && nfe.length) return String(nfe[0]);
    }
    if (typeof this.detail === "string") return this.detail;
    return this.message;
  }

  /** The session is gone; the user has to sign in again. */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  /** Signed in, but not allowed to do this. */
  get isPermissionError(): boolean {
    return this.status === 403;
  }

  /**
   * Worth retrying. A 500 or a network blip may succeed on a second
   * attempt; a 400 will not, and retrying it just wastes the user's time.
   *
   * 429 is excluded deliberately: the server is asking for less traffic,
   * and retrying automatically is the opposite of that.
   */
  get isRetryable(): boolean {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504;
  }
}

/** Build an ApiError from a failed response. */
export async function apiErrorFrom(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON — a proxy error page, or an empty body.
  }

  const envelope =
    body && typeof body === "object" ? (body as Record<string, unknown>).error : null;

  if (envelope && typeof envelope === "object") {
    const e = envelope as Record<string, unknown>;
    const code = typeof e.code === "string" ? e.code : "error";
    const err = new ApiError(humanMessage(response.status, code), response.status, code, e.detail);
    return err;
  }

  // No envelope: something upstream of Django failed — a gateway, or the
  // service being down. The user does not need to know which.
  return new ApiError(humanMessage(response.status, "error"), response.status, "error", body);
}

/**
 * A sentence a person can act on.
 *
 * Deliberately not the raw status text: "Bad Request" tells a customer
 * nothing. Where the backend sent something specific, formError surfaces
 * that instead of this.
 */
function humanMessage(status: number, code: string): string {
  if (code === "throttled") {
    return "Too many attempts. Wait a moment and try again.";
  }
  switch (status) {
    case 400:
      return "Some of those details need checking.";
    case 401:
      return "Please sign in to continue.";
    case 403:
      return "You do not have access to that.";
    case 404:
      return "We could not find that.";
    case 409:
      return "That conflicts with something that already exists.";
    case 500:
      return "Something went wrong at our end. Please try again.";
    default:
      return status >= 500
        ? "The service is having trouble. Please try again shortly."
        : "That request could not be completed.";
  }
}

/** A request that never reached the server. */
export function networkError(cause?: unknown): ApiError {
  return new ApiError(
    "Could not reach ONA. Check your connection and try again.",
    0,
    "network_error",
    cause,
  );
}
