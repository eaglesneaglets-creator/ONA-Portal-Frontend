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

/**
 * Roles with no portal in this release.
 *
 * ADR-015 narrowed the v0.1 MVP to the customer and admin workflows. The
 * professional portal, and everything it depends on — profiles, listings,
 * proposals, messaging — ships in v0.2/v0.3. The backend still accepts
 * `professional` at registration, and app/pro/ was built against the old
 * scope, so without this a professional signs up today and lands in a portal
 * whose features do not exist yet.
 *
 * This is a scope decision, not a permission one. Nothing here is security:
 * DRF still authorises every endpoint against the database.
 */
export const DEFERRED_ROLES: readonly Role[] = ["professional"] as const;

export function isDeferredRole(role: Role): boolean {
  return DEFERRED_ROLES.includes(role);
}

/** Where a role with no portal yet gets sent. */
export const DEFERRED_HOME = "/coming-soon";

/** Where each role lands after signing in, and where a mismatch sends them. */
const HOME_FOR: Record<Role, string> = {
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
  { prefix: "/pro", roles: [] },
  { prefix: "/admin", roles: ["admin"] },
];

/** Signed-in users are bounced off these — nobody logs in twice. */
const GUEST_ONLY = ["/login", "/register", "/forgot-password", "/reset-password"];

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

/**
 * Where this role lands after signing in.
 *
 * Deferred roles (ADR-015) go to the holding page rather than their portal.
 * The check comes first so HOME_FOR can keep the real destination — in v0.2,
 * emptying DEFERRED_ROLES restores it with no other change here.
 *
 * redirectFor() depends on this never returning a path the role cannot
 * access, or the two would bounce each other forever. DEFERRED_HOME is
 * public, so a deferred role is left alone once it lands there.
 */
export function homeFor(role: Role): string {
  if (isDeferredRole(role)) return DEFERRED_HOME;
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
