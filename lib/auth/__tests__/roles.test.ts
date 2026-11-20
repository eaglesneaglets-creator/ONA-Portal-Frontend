/**
 * Route rules.
 *
 * Pure functions, so these are cheap and exhaustive. Worth being thorough:
 * a wrong entry here sends a customer into the admin console, or bounces a
 * professional off their own dashboard.
 */

import { describe, expect, it } from "vitest";

import {
  DEFERRED_HOME,
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
    expect(canAccess("admin", "/admin/payments")).toBe(true);
    // The professional/"/pro" case moved to the deferred-portal block below:
    // in v0.1 nobody may enter /pro (ADR-015). Restore it here in v0.2.
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
    expect(redirectFor("admin", "/customer/bookings")).toBe("/admin");

    // A professional has no portal in v0.1 (ADR-015), so "their own portal"
    // is the coming-soon page. Updated from "/pro" when the MVP was rescoped.
    expect(redirectFor("professional", "/admin/payments")).toBe(DEFERRED_HOME);
  });

  it("does not redirect a user who is where they belong", () => {
    expect(redirectFor("customer", "/customer/bookings")).toBeNull();
    expect(redirectFor("admin", "/admin/reviews")).toBeNull();
  });

  // ADR-015 deferred the professional portal to v0.2. These four tests replace
  // the pre-rescope assertions that /pro was a professional's home. Delete
  // this block and restore the old expectations when the portal ships.
  describe("deferred professional portal (v0.1)", () => {
    it("sends a professional to the coming-soon page, not /pro", () => {
      expect(homeFor("professional")).toBe(DEFERRED_HOME);
    });

    it("keeps every role out of /pro, including professionals", () => {
      // Typing the URL directly must not land anyone in the unbuilt portal.
      for (const role of ROLES) {
        expect(canAccess(role, "/pro")).toBe(false);
        expect(canAccess(role, "/pro/projects")).toBe(false);
      }
      expect(redirectFor("professional", "/pro")).toBe(DEFERRED_HOME);
    });

    it("leaves /pro listed as protected rather than silently public", () => {
      // Removing the PROTECTED entry instead of emptying its roles would make
      // canAccess() return true for everyone — the opposite of the intent.
      expect(isProtectedRoute("/pro")).toBe(true);
      expect(isProtectedRoute("/pro/projects")).toBe(true);
    });

    it("does not bounce a professional off the page it just sent them to", () => {
      // The loop check from homeFor()'s docstring: if the redirect target were
      // itself inaccessible, the two rules would ping-pong forever.
      expect(redirectFor("professional", DEFERRED_HOME)).toBeNull();
    });
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
