import { expect, test } from "@playwright/test";

/**
 * /studio — the public catalogue.
 *
 * The first test needs no backend: the page must render (header, hero,
 * section headings) even when the API is down, with a calm notice instead
 * of a 500. The rest need the seeded backend and skip without it.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

let backendUp = false;

test.beforeAll(async ({ request }) => {
  try {
    backendUp = (await request.get(`${API}/health/`, { timeout: 3_000 })).ok();
  } catch {
    backendUp = false;
  }
});

test("renders without a backend and never 500s", async ({ page }) => {
  const res = await page.goto("/studio");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/clear prices/i);
  await expect(page.getByRole("heading", { name: "Studio time" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
  await expect(page.getByRole("link", { name: /book a session/i })).toBeVisible();
});

test("shows seeded rooms with GHS prices from the API", async ({ page }) => {
  test.skip(!backendUp, `Backend not reachable at ${API}`);
  await page.goto("/studio");

  // Room names come from seed_studio; the price format is the API's.
  const rooms = page.getByRole("region", { name: "Studio time" });
  await expect(rooms.getByRole("heading", { level: 3 }).first()).toBeVisible();
  await expect(rooms.getByText(/GHS \d{1,3}(,\d{3})*\.\d{2}/).first()).toBeVisible();
  await expect(rooms.getByText(/per hour/).first()).toBeVisible();

  // Every room has a book button that routes through registration.
  const book = rooms.getByRole("link", { name: /^Book /i }).first();
  await expect(book).toHaveAttribute("href", /\/register\?next=/);
});

test("lists services with a price per duration", async ({ page }) => {
  test.skip(!backendUp, `Backend not reachable at ${API}`);
  await page.goto("/studio");
  const services = page.getByRole("region", { name: "Services" });
  await expect(services.getByText(/per \d+ (hr|hrs|min)/).first()).toBeVisible();
});
