/**
 * Route rules.
 *
 * Pure functions, so these are cheap and exhaustive. Worth being thorough:
 * a wrong entry here sends a customer into the admin console, or bounces a
 * professional off their own dashboard.
 */

import { describe, expect, it } from "vitest";

import {
  ROLES,
  canAccess,
  homeFor,
  isGuestOnlyRoute,
  isProtectedRoute,
  isRole,
  redirectFor,
  type Role,
} from "../roles";

describe("route classification", () => {
  it("recognises the portal roots and their children", () => {
    for (const path of ["/customer", "/customer/bookings", "/pro", "/pro/projects", "/admin", "/admin/payments"]) {
      expect(isProtectedRoute(path)).toBe(true);
    }
  });

  it("leaves public routes open", () => {
    for (const path of ["/", "/services", "/faqs", "/contact", "/legal/terms"]) {
      expect(isProtectedRoute(path)).toBe(false);
    }
  });

  it("does not treat a lookalike prefix as protected", () => {
    // "/administrators" starts with "/admin" as a string but is a different
    // route. Matching on raw startsWith without the boundary would lock a
    // public page behind the admin guard.
    expect(isProtectedRoute("/administrators")).toBe(false);
    expect(isProtectedRoute("/professionals")).toBe(false);
    expect(isProtectedRoute("/customers-love-us")).toBe(false);
  });

  it("knows the guest-only pages", () => {
    expect(isGuestOnlyRoute("/login")).toBe(true);
    expect(isGuestOnlyRoute("/register")).toBe(true);
    expect(isGuestOnlyRoute("/customer")).toBe(false);
  });
});

describe("access", () => {
  it("lets each role into its own portal", () => {
    expect(canAccess("customer", "/customer/bookings")).toBe(true);
    expect(canAccess("professional", "/pro/projects")).toBe(true);
    expect(canAccess("admin", "/admin/payments")).toBe(true);
  });

  it("keeps each role out of the others", () => {
    expect(canAccess("customer", "/admin")).toBe(false);
    expect(canAccess("customer", "/pro")).toBe(false);
    expect(canAccess("professional", "/admin")).toBe(false);
    expect(canAccess("professional", "/customer")).toBe(false);
    expect(canAccess("admin", "/customer")).toBe(false);
    expect(canAccess("admin", "/pro")).toBe(false);
  });

  it("lets every role onto public routes", () => {
    for (const role of ROLES) {
      expect(canAccess(role, "/")).toBe(true);
      expect(canAccess(role, "/services")).toBe(true);
    }
  });
});

describe("redirects", () => {
  it("sends a mismatched user to their OWN portal, not a dead end", () => {
    // The criterion from the task list: visiting /admin as a customer must
    // land somewhere useful, not on a 403 page.
    expect(redirectFor("customer", "/admin")).toBe("/customer");
    expect(redirectFor("customer", "/pro/projects")).toBe("/customer");
    expect(redirectFor("professional", "/admin/payments")).toBe("/pro");
    expect(redirectFor("admin", "/customer/bookings")).toBe("/admin");
  });

  it("does not redirect a user who is where they belong", () => {
    expect(redirectFor("customer", "/customer/bookings")).toBeNull();
    expect(redirectFor("professional", "/pro")).toBeNull();
    expect(redirectFor("admin", "/admin/reviews")).toBeNull();
  });

  it("does not redirect anyone off a public page", () => {
    for (const role of ROLES) {
      expect(redirectFor(role, "/services")).toBeNull();
    }
  });

  it("bounces a signed-in user off the login page", () => {
    // Otherwise a stale /login link shows a form that cannot usefully be
    // submitted.
    for (const role of ROLES) {
      expect(redirectFor(role, "/login")).toBe(homeFor(role));
    }
  });

  it("never sends a role somewhere it cannot go", () => {
    // Guards against the loop where the redirect target is itself
    // forbidden, so the router ping-pongs forever.
    for (const role of ROLES) {
      const home = homeFor(role);
      expect(canAccess(role, home)).toBe(true);
      expect(redirectFor(role, home)).toBeNull();
    }
  });
});

describe("isRole", () => {
  it("accepts the three real roles", () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const bad of ["superadmin", "", null, undefined, 42, {}, "Customer"]) {
      expect(isRole(bad)).toBe(false);
    }
  });
});

describe("coverage of the role table", () => {
  it("gives every role a home", () => {
    const seen = new Set<string>();
    for (const role of ROLES) {
      const home = homeFor(role as Role);
      expect(home).toMatch(/^\//);
      // Two roles sharing a home would mean a redirect could not
      // distinguish them.
      expect(seen.has(home)).toBe(false);
      seen.add(home);
    }
  });
});
