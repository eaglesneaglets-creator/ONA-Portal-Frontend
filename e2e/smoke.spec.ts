import { expect, test } from "@playwright/test";

/**
 * Routing and guards, with no backend.
 *
 * These prove the parts of Task 1 that live entirely in the frontend: public
 * pages render, protected portals bounce anonymous visitors to /login with a
 * return path, and the deferred /pro portal (ADR-015) is not reachable.
 */

test("homepage renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ONA/i);
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
