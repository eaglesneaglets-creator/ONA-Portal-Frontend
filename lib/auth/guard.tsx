/**
 * Client-side route guards.
 *
 * WHY NOT middleware.ts
 *
 * The plan assumed middleware. Middleware runs on the server and can only
 * read cookies, but the access token is in memory and the refresh token is
 * in localStorage — neither is visible to the server. Middleware therefore
 * cannot tell a signed-in user from a signed-out one, and would redirect
 * everyone to /login.
 *
 * So guarding is client-side until the refresh token moves to an httpOnly
 * cookie (planned for the domain cutover). At that point middleware becomes
 * possible and this component stays as the second layer, because the rules
 * live in one shared table (lib/auth/roles.ts).
 *
 * WHAT THIS IS AND IS NOT
 *
 * This is navigation, not security. It decides what to render and where to
 * send someone. Authorisation is enforced by DRF permission classes on every
 * endpoint, reading the database. Someone who edits their role in devtools
 * sees a different shell and gets exactly the same 403s.
 */

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { redirectFor } from "@/lib/auth/roles";
import { useAuthStore } from "@/lib/auth/store";

/**
 * Boots the session once, at the app root.
 *
 * Separate from RequireAuth because public pages need the session restored
 * too — the homepage shows "Sign in" or the user's name depending on it.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialise = useAuthStore((s) => s.initialise);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  return <>{children}</>;
}

interface RequireAuthProps {
  children: React.ReactNode;
  /** Shown while the session is being restored. */
  fallback?: React.ReactNode;
}

/**
 * Send a signed-in user to their own portal if this path is not for them.
 *
 * Shared by both guards: RequireAuth uses it for a role mismatch,
 * RequireGuest for a signed-in user sitting on /login. Same rule, same
 * table, one implementation.
 */
function useRoleRedirect(): void {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    const destination = redirectFor(user.role, pathname);
    if (destination) router.replace(destination);
  }, [status, user, pathname, router]);
}

/**
 * Wrap a portal layout in this.
 *
 * Three states, and the middle one is the one that gets forgotten:
 *   loading       — we do not know yet. Render the fallback, redirect nobody.
 *   anonymous     — send to /login, remembering where they were headed.
 *   authenticated — check the role against the path.
 *
 * Treating `loading` as signed-out is the classic bug: every reload flashes
 * the login page before restoring the user.
 */
export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  // Role mismatches are handled by the shared rule.
  useRoleRedirect();

  useEffect(() => {
    if (status !== "anonymous") return;
    // Carry the intended destination so sign-in can return them to it.
    // Someone following a link to a specific booking should land on that
    // booking, not on a generic dashboard.
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  // Render the fallback whenever the answer is not yet "yes, show them this":
  // still loading, signed out and being redirected, or signed in but on the
  // wrong portal. Anything else flashes a page the user should not see.
  const settled =
    status === "authenticated" && user && !redirectFor(user.role, pathname);

  return settled ? <>{children}</> : <>{fallback ?? <AuthSplash />}</>;
}

/**
 * Guest-only pages: /login, /register.
 *
 * A signed-in user landing here goes to their own portal. Without this,
 * following a stale link to /login while signed in shows a form that
 * cannot usefully be submitted.
 */
export function RequireGuest({ children, fallback }: RequireAuthProps) {
  const status = useAuthStore((s) => s.status);

  useRoleRedirect();

  // Only a settled-anonymous visitor sees the form. `loading` must not fall
  // through, or a signed-in user glimpses the login page on every reload.
  return status === "anonymous" ? <>{children}</> : <>{fallback ?? <AuthSplash />}</>;
}

/** Deliberately quiet — this is visible for a fraction of a second. */
function AuthSplash() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Checking your session</span>
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-pill border-2 border-border-default border-t-ona-red"
      />
    </div>
  );
}
