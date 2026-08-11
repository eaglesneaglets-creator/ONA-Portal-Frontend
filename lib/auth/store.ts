/**
 * Auth store.
 *
 * WHAT IS PERSISTED, AND WHAT IS NOT
 *
 * Nothing here is persisted by zustand. The access token lives in memory
 * (lib/api/tokens.ts) and the refresh token in localStorage behind the
 * RefreshTokenStore seam. A `persist` middleware would write the user object
 * — including their email — to localStorage as well, which adds a second
 * copy of personal data to steal and a second thing to keep in sync.
 *
 * Instead the session is *rebuilt* on boot: if a refresh token exists, swap
 * it for an access token and fetch /auth/me/. One source of truth, and a
 * revoked session is discovered immediately rather than showing a stale user
 * from storage.
 *
 * The cost is a brief loading state on first paint. That is the honest
 * trade: a flash of "checking" beats rendering a signed-in shell for someone
 * whose session was revoked an hour ago.
 */

"use client";

import { create } from "zustand";

import { api, refreshAccessToken } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { clearTokens, getRefreshToken, hasResumableSession, setTokens } from "@/lib/api/tokens";
import type { Role } from "@/lib/auth/roles";

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  first_name: string;
  last_name: string;
  phone: string;
  public_ref: number | null;
  is_email_verified: boolean;
  date_joined: string;
}

interface AuthTokens {
  access: string;
  refresh: string;
}

interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

/**
 * `loading` is the state before we know. Guards must treat it as "wait",
 * never as "signed out" — otherwise every reload bounces the user to /login
 * for a moment before restoring them.
 */
export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  user: User | null;
  status: AuthStatus;

  /** Rebuild the session on boot. Safe to call more than once. */
  initialise: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  /** After a profile edit, so the shell shows the new name immediately. */
  setUser: (user: User) => void;
}

export interface RegisterInput {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: Extract<Role, "customer" | "professional">;
}

/** Guards against a double initialise from React strict mode's double render. */
let initialisePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",

  initialise: () => {
    if (initialisePromise) return initialisePromise;

    initialisePromise = (async () => {
      if (!hasResumableSession()) {
        set({ user: null, status: "anonymous" });
        return;
      }

      try {
        // The access token died with the last page. Trade the refresh token
        // for a new one before asking who we are.
        await refreshAccessToken();
        const user = await api.get<User>("/auth/me/");
        set({ user, status: "authenticated" });
      } catch (error) {
        // A dead session is expected here and not worth surfacing.
        //
        // A network failure is different: the session may be perfectly
        // valid and simply unreachable. refreshAccessToken already leaves
        // the tokens alone in that case, so a reload once connectivity
        // returns restores the user rather than forcing a fresh sign-in.
        if (error instanceof ApiError && error.code !== "network_error") {
          clearTokens();
        }
        set({ user: null, status: "anonymous" });
      } finally {
        initialisePromise = null;
      }
    })();

    return initialisePromise;
  },

  login: async (email, password) => {
    const data = await api.post<LoginResponse>(
      "/auth/login/",
      { email, password },
      { anonymous: true },
    );
    setTokens(data.tokens);
    set({ user: data.user, status: "authenticated" });
    return data.user;
  },

  register: async (input) => {
    const data = await api.post<LoginResponse>("/auth/register/", input, {
      anonymous: true,
    });
    // The backend issues tokens on registration, so the user is signed in
    // straight away. Verification gates booking and payouts, not looking
    // around — blocking everything on an email is how signups get abandoned.
    setTokens(data.tokens);
    set({ user: data.user, status: "authenticated" });
    return data.user;
  },

  logout: async () => {
    // Read the token BEFORE clearing, or there is nothing to send and the
    // server-side blacklist never happens — leaving a valid refresh token
    // in the wild until it expires.
    const refresh = getRefreshToken();

    // Clear locally first. If the request fails the user is still signed
    // out on this device, which is what they asked for.
    set({ user: null, status: "anonymous" });

    if (refresh) {
      try {
        await api.post("/auth/logout/", { refresh }, { retries: 0 });
      } catch {
        // Already signed out here; the token expires on its own.
      }
    }
    clearTokens();
  },

  setUser: (user) => set({ user, status: "authenticated" }),
}));

/** Test-only: reset the module-level initialise guard. */
export function __resetAuthStore(): void {
  initialisePromise = null;
  useAuthStore.setState({ user: null, status: "loading" });
}
