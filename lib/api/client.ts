/**
 * API client.
 *
 * Adapted from the Eagles & Eaglets client, which had two mechanisms doing
 * the same job — an `isRefreshing` flag with a `failedQueue`, and a memoised
 * `_refreshPromise`. Only the promise one is carried over. One way to do a
 * thing; two is how they drift.
 *
 * WHY THE DEDUPE MATTERS
 * A dashboard fires several requests at once. If the access token has
 * expired they all get 401 together. Without dedupe that is N refresh calls
 * racing each other — and with ROTATE_REFRESH_TOKENS on the backend, the
 * first one to land invalidates the token the others are still using, so
 * most of them fail and the user is signed out mid-session for no reason.
 *
 * Memoising the in-flight promise means the first 401 starts the refresh and
 * every other 401 awaits that same promise.
 */

import { ApiError, apiErrorFrom, networkError } from "./errors";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasResumableSession,
  refreshStore,
  setAccessToken,
  setTokens,
} from "./tokens";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(
  /\/$/,
  "",
);

/** Endpoints that must never trigger a refresh-and-retry. */
const AUTH_ENDPOINTS = ["/auth/login/", "/auth/register/", "/auth/refresh/"];

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the Authorization header. For public endpoints. */
  anonymous?: boolean;
  /** Retries on transient failures. Default 2; 0 disables. */
  retries?: number;
}

/* ------------------------------------------------------------------ */
/* Refresh                                                             */
/* ------------------------------------------------------------------ */

let refreshInFlight: Promise<string> | null = null;

/**
 * Exchange the refresh token for a new access token.
 *
 * Concurrent callers get the same promise, so exactly one network request
 * happens no matter how many requests hit 401 at once.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = getRefreshToken();

    // isOpaque means the browser holds the token in a cookie and will send
    // it automatically — there is nothing to read, and nothing to check.
    if (!refresh && !refreshStore.isOpaque) {
      throw new ApiError("Your session has ended. Please sign in.", 401, "no_refresh_token");
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: refreshStore.isOpaque ? "include" : "same-origin",
        body: JSON.stringify(refresh ? { refresh } : {}),
      });
    } catch (cause) {
      // A network failure is NOT a dead session. Clearing tokens here would
      // sign someone out because their train went through a tunnel.
      throw networkError(cause);
    }

    if (!response.ok) {
      // The server rejected the token: expired, rotated, or blacklisted.
      // This one really is the end of the session.
      clearTokens();
      throw new ApiError("Your session has expired. Please sign in again.", 401, "session_expired");
    }

    const data = (await response.json()) as { access: string; refresh?: string };
    if (!data.access) {
      clearTokens();
      throw new ApiError("Your session has expired. Please sign in again.", 401, "session_expired");
    }

    // The backend rotates refresh tokens, so a new one usually comes back.
    // Storing it is what keeps the session alive past the refresh lifetime.
    if (data.refresh) {
      setTokens({ access: data.access, refresh: data.refresh });
    } else {
      setAccessToken(data.access);
    }

    return data.access;
  })().finally(() => {
    // Cleared in finally so a failed refresh does not wedge every later
    // request behind a permanently rejected promise.
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/* ------------------------------------------------------------------ */
/* Request                                                             */
/* ------------------------------------------------------------------ */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function performRequest(path: string, options: RequestOptions): Promise<Response> {
  // `retries` is destructured out deliberately: it is ours, not fetch's,
  // and passing it through would end up on the RequestInit.
  const { body, anonymous, headers, ...rest } = options;
  delete (rest as { retries?: number }).retries;

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (!anonymous) {
    const token = getAccessToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: refreshStore.isOpaque ? "include" : "same-origin",
    body:
      body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const maxRetries = options.retries ?? 2;
  let attempt = 0;

  for (;;) {
    let response: Response;
    try {
      response = await performRequest(path, options);
    } catch (cause) {
      const err = networkError(cause);
      if (attempt < maxRetries) {
        // Exponential backoff: 300ms, 600ms. Enough to ride out a blip
        // without making a broken connection feel like a hung page.
        await sleep(300 * 2 ** attempt);
        attempt += 1;
        continue;
      }
      throw err;
    }

    // 401 → refresh once, then retry the original request.
    //
    // Excluded for auth endpoints: a 401 from /auth/login/ means wrong
    // password, and refreshing would loop. A 401 from /auth/refresh/ means
    // the session is genuinely over.
    if (
      response.status === 401 &&
      !options.anonymous &&
      !AUTH_ENDPOINTS.some((e) => path.startsWith(e)) &&
      hasResumableSession()
    ) {
      try {
        await refreshAccessToken();
      } catch (refreshErr) {
        throw refreshErr instanceof ApiError ? refreshErr : await apiErrorFrom(response);
      }

      // One retry only. If it 401s again the token is not the problem.
      const retried = await performRequest(path, options);
      if (!retried.ok) throw await apiErrorFrom(retried);
      return parse<T>(retried);
    }

    if (!response.ok) {
      const err = await apiErrorFrom(response);
      if (err.isRetryable && attempt < maxRetries) {
        await sleep(300 * 2 ** attempt);
        attempt += 1;
        continue;
      }
      throw err;
    }

    return parse<T>(response);
  }
}

async function parse<T>(response: Response): Promise<T> {
  // 204 and 205 carry no body — logout returns 205.
  if (response.status === 204 || response.status === 205) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  baseUrl: BASE_URL,

  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

/** Test-only: reset the memoised refresh between cases. */
export function __resetRefreshState(): void {
  refreshInFlight = null;
}
