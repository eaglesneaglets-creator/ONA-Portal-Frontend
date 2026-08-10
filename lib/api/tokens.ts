/**
 * Token storage.
 *
 * TWO TOKENS, TWO DIFFERENT PLACES, ON PURPOSE
 *
 * The access token lives in memory only. It is short-lived (30 minutes) and
 * sent on every request, so keeping it out of storage means a stolen
 * localStorage dump does not hand over a working session — and it dies with
 * the tab, which is the correct default.
 *
 * The refresh token has to survive a page reload, or the user is signed out
 * every time they open a link. It therefore goes to localStorage for now.
 *
 * MIGRATION PLANNED (decision made 2026-08-10)
 * localStorage is readable by any injected script, so this is the weaker of
 * the two options. Once the platform has its own domain, the refresh token
 * moves to an httpOnly cookie the backend sets, which JavaScript cannot
 * read at all.
 *
 * That is why storage sits behind RefreshTokenStore rather than being called
 * directly: the swap becomes one new implementation and one line in
 * `refreshStore`, with no change to the client or to any calling code.
 * `clearLegacyLocalStorage()` exists to clean up after the cutover.
 */

const ACCESS_LISTENERS = new Set<(token: string | null) => void>();

/** In memory only. Never written to disk. */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  for (const listener of ACCESS_LISTENERS) listener(token);
}

/** Notified whenever the access token changes, so the auth store can react. */
export function onAccessTokenChange(fn: (token: string | null) => void): () => void {
  ACCESS_LISTENERS.add(fn);
  return () => ACCESS_LISTENERS.delete(fn);
}

/** The seam the httpOnly migration swaps out. */
export interface RefreshTokenStore {
  get(): string | null;
  set(token: string | null): void;
  /**
   * True when the browser holds the refresh token itself and does not
   * expose it to JavaScript. The client uses this to decide whether to send
   * the token in the request body or rely on a cookie.
   */
  readonly isOpaque: boolean;
}

const STORAGE_KEY = "ona.refresh";

/** Current implementation. Replaced by CookieRefreshStore after the cutover. */
const localStorageRefreshStore: RefreshTokenStore = {
  isOpaque: false,

  get() {
    // Guarded because this module is imported during server rendering,
    // where localStorage does not exist.
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage can throw in private mode or when disabled entirely.
      // Failing to read a token is not worth crashing a page render for.
      return null;
    }
  },

  set(token) {
    if (typeof window === "undefined") return;
    try {
      if (token === null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, token);
    } catch {
      // Same reasoning. The session then lasts until the tab closes, which
      // is degraded but working.
    }
  },
};

/**
 * The store the app uses.
 *
 * After the domain cutover this becomes a cookie-backed implementation with
 * isOpaque: true, and nothing else in the codebase changes.
 */
export const refreshStore: RefreshTokenStore = localStorageRefreshStore;

export function getRefreshToken(): string | null {
  return refreshStore.get();
}

export function setRefreshToken(token: string | null): void {
  refreshStore.set(token);
}

/** Sign-in: store both. */
export function setTokens(tokens: { access: string; refresh: string }): void {
  setAccessToken(tokens.access);
  setRefreshToken(tokens.refresh);
}

/** Sign-out, or a refresh that failed. Wipes both. */
export function clearTokens(): void {
  setAccessToken(null);
  setRefreshToken(null);
}

/**
 * Remove the localStorage token after migrating to httpOnly cookies.
 *
 * Call once on boot after the cutover. Without it, a token issued before
 * the change sits in localStorage indefinitely — still valid, still
 * stealable, and no longer used for anything.
 */
export function clearLegacyLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; the token expires on its own.
  }
}

/**
 * True when a session might be resumable.
 *
 * The access token is gone after a reload, so its absence says nothing. A
 * refresh token means it is worth attempting a refresh before deciding the
 * user is signed out.
 */
export function hasResumableSession(): boolean {
  return refreshStore.isOpaque || getRefreshToken() !== null;
}
