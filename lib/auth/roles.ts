/**
 * Roles and route rules.
 *
 * One table, used by the client guard and — after the httpOnly cookie
 * migration — by middleware too. Splitting these rules across guards is how
 * a route ends up protected in one place and open in another.
 *
 * IMPORTANT: none of this is authorisation. It decides what to *render* and
 * where to *redirect*. Every endpoint is checked server-side by DRF
 * permission classes (core/permissions/roles.py), which read the database
 * rather than trusting anything the browser says. A user who edits their
 * role in devtools gets a different-looking page and the same 403s.
 */

export type Role = "customer" | "professional" | "admin";

export const ROLES: readonly Role[] = ["customer", "professional", "admin"] as const;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Where each role lands after signing in, and where a mismatch sends them. */
export const HOME_FOR: Record<Role, string> = {
  customer: "/customer",
  professional: "/pro",
  admin: "/admin",
};

/**
 * Route prefix -> who may see it.
 *
 * Order matters: the first matching prefix wins, so more specific paths go
 * first. Anything not listed is public.
 */
const PROTECTED: ReadonlyArray<{ prefix: string; roles: readonly Role[] }> = [
  { prefix: "/customer", roles: ["customer"] },
  { prefix: "/pro", roles: ["professional"] },
  { prefix: "/admin", roles: ["admin"] },
];

/** Signed-in users are bounced off these — nobody logs in twice. */
const GUEST_ONLY = ["/login", "/register", "/reset-password"];

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED.some((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
}

export function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** May this role see this path? Public routes are open to everyone. */
export function canAccess(role: Role, pathname: string): boolean {
  const rule = PROTECTED.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!rule) return true;
  return rule.roles.includes(role);
}

export function homeFor(role: Role): string {
  return HOME_FOR[role];
}

/**
 * Where to send someone who has landed somewhere they should not be.
 *
 * Their own portal, never a dead end or a bare 403 page. A customer who
 * follows a stale /admin link should find themselves somewhere useful, not
 * staring at an error.
 */
export function redirectFor(role: Role, pathname: string): string | null {
  if (isGuestOnlyRoute(pathname)) return homeFor(role);
  if (canAccess(role, pathname)) return null;
  return homeFor(role);
}
