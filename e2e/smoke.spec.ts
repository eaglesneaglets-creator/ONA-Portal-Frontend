import { expect, test } from "@playwright/test";

/**
 * Routing and guards, with no backend.
 *
 * These prove the parts of Task 1 that live entirely in the frontend: public
 * pages render, protected portals bounce anonymous visitors to /login with a
 * return path, and the deferred /pro portal (ADR-015) is not reachable.
 */

test("homepage renders with its two ways in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ONA/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/book the room/i);
  await expect(page.getByRole("link", { name: /rooms & prices/i }).first()).toHaveAttribute("href", "/studio");
  // Marketplace is deferred (ADR-015): no link may promise it.
  await expect(page.getByRole("link", { name: /find a professional/i })).toHaveCount(0);
});

test("sends security headers", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("coming-soon holding page renders and offers a way out", async ({ page }) => {
  await page.goto("/coming-soon");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/marketplace/i);
  await expect(page.getByRole("link", { name: /homepage/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
});

for (const portal of ["/customer", "/admin", "/pro"]) {
  test(`anonymous visitor to ${portal} is sent to /login with a return path`, async ({ page }) => {
    await page.goto(portal);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(portal)}`));
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
}

test("unknown route shows the 404 page", async ({ page }) => {
  const response = await page.goto("/this-track-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/catalogue/i);
});

test("the password Show button sits inside its input, on phones too", async ({ page }) => {
  // Regression: an unlayered `position: relative` (touch screens only)
  // overrode the button's `absolute`, dropping it under the field.
  await page.goto("/login");
  const input = page.getByLabel(/^password/i);
  const toggle = page.getByRole("button", { name: "Show" });
  const i = await input.boundingBox();
  const t = await toggle.boundingBox();
  expect(i && t).toBeTruthy();
  expect(t!.y).toBeGreaterThanOrEqual(i!.y - 1);
  expect(t!.y + t!.height).toBeLessThanOrEqual(i!.y + i!.height + 1);
  expect(t!.x + t!.width).toBeLessThanOrEqual(i!.x + i!.width + 1);
});
