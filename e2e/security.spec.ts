import { expect, test, type Page } from "@playwright/test";

/**
 * Task 18 — the browser-side security controls, checked in a real browser.
 *
 *  - Every page carries a nonce-based script CSP, and Next's own scripts
 *    carry the nonce.
 *  - Injected markup cannot run script (inline handlers are blocked).
 *  - Walking the public, customer and staff pages raises no CSP violation —
 *    the policy blocks attacks, not the app.
 *  - Five wrong passwords lock the account; the form says so.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const PASSWORD = "Studio-Session-2026!";

let backendUp = false;
test.beforeAll(async ({ request }) => {
  try {
    backendUp = (await request.get(`${API}/health/`, { timeout: 3_000 })).ok();
  } catch {
    backendUp = false;
  }
});

function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to (execute|load|apply)/i.test(m.text())) violations.push(m.text());
  });
  return violations;
}

test("pages carry a nonce-based script policy, and Next's scripts carry the nonce", async ({ page }) => {
  const res = await page.goto("/");
  const csp = res!.headers()["content-security-policy"] ?? "";
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  expect(nonce, csp).toBeTruthy();
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  // A fresh nonce per request.
  const again = (await page.request.get("/")).headers()["content-security-policy"] ?? "";
  expect(/'nonce-([^']+)'/.exec(again)?.[1]).not.toBe(nonce);
  // Next stamped it on its inline bootstrap scripts.
  const stamped = await page.locator("script[nonce]").count();
  expect(stamped).toBeGreaterThan(0);
});

test("injected markup cannot run script", async ({ page }) => {
  // What a stored-XSS string becomes once rendered: markup with an inline
  // handler. (A <script> added from page.evaluate is not a fair test — the
  // devtools protocol runs outside CSP and 'strict-dynamic' trusts it.)
  const violations = watchCsp(page);
  await page.goto("/login");
  const ran = await page.evaluate(async () => {
    const d = document.createElement("div");
    d.innerHTML = '<img src="/missing.png" onerror="window.__ona_injected = true">';
    document.body.appendChild(d);
    await new Promise((r) => setTimeout(r, 800));
    return (window as unknown as { __ona_injected?: boolean }).__ona_injected === true;
  });
  expect(ran).toBe(false);
  expect(violations.some((v) => /inline event handler/i.test(v))).toBe(true);
});

test("walking the app raises no CSP violation", async ({ page }) => {
  test.skip(!backendUp, `Backend not reachable at ${API}`);
  test.setTimeout(120_000);
  const violations = watchCsp(page);

  for (const path of ["/", "/studio", "/faqs", "/login", "/register"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }

  // A customer: register, then the portal and the booking flow up to review.
  const email = `e2e-sec-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/register");
  await page.getByRole("button", { name: /^I.m hiring/i }).click();
  await page.getByLabel(/first name/i).fill("Sec");
  await page.getByLabel(/last name/i).fill("Check");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(PASSWORD);
  await page.getByLabel(/confirm password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /create|sign up|register/i }).click();
  await expect(page).toHaveURL(/\/customer/);
  // Let each load finish restoring the session before the next one: a full
  // reload mid-refresh loses the rotated token (UAT defect D8, logged).
  await page.goto("/customer/bookings");
  await page.waitForLoadState("networkidle");
  await page.goto("/customer/book");
  await page.getByRole("button", { name: /Studio A/ }).click();
  await page.getByRole("button", { name: /Engineer One/ }).click();
  await page.getByRole("button", { name: /Recording session/ }).click();
  await expect(page.getByRole("list", { name: "Days" }).getByRole("button").first()).toBeVisible();

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/^password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/admin/);
    for (const path of ["/admin/bookings", "/admin/payments", "/admin/catalogue"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    // Menus, sheets and toasts position themselves with inline styles.
    await page.goto("/admin/bookings?when=all");
    const actions = page.getByRole("button", { name: /^Actions for/ }).first();
    if (await actions.count()) {
      await actions.click();
      await page.getByRole("menuitem", { name: "View details" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
  }

  expect(violations, violations.join("\n")).toEqual([]);
});

test("five wrong passwords lock the account, and the form says so", async ({ page }) => {
  test.skip(!backendUp, `Backend not reachable at ${API}`);
  const email = `e2e-lock-${Date.now()}-${test.info().project.name}@example.com`;
  await page.goto("/login");
  for (let i = 0; i < 5; i++) {
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(`wrong-${i}`);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  }
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page.getByText(/Too many failed sign-ins/)).toBeVisible();
});
