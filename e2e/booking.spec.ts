import { expect, test, type Page } from "@playwright/test";

/**
 * CHECKPOINT B — a booking end to end through the UI, and a double-book
 * attempt that is refused with a sentence.
 *
 * Needs the seeded backend (docker compose up, runserver, seed_studio).
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const PASSWORD = "Studio-Session-2026!";

let backendUp = false;

test.beforeAll(async ({ request }) => {
  try {
    backendUp = (await request.get(`${API}/health/`, { timeout: 3_000 })).ok();
  } catch {
    backendUp = false;
  }
});

test.beforeEach(() => {
  test.skip(!backendUp, `Backend not reachable at ${API}`);
});

async function registerCustomer(page: Page) {
  const email = `e2e-book-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/register");
  await page.getByRole("button", { name: /^I.m hiring/i }).click();
  await page.getByLabel(/first name/i).fill("E2E");
  await page.getByLabel(/last name/i).fill("Booker");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(PASSWORD);
  await page.getByLabel(/confirm password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /create|sign up|register/i }).click();
  await expect(page).toHaveURL(/\/customer(\/|$)/);
}

/**
 * Walks to the slot step on the last day in the window and picks the free
 * slot at `offset`. Each test × project runs in its own worker against one
 * shared database, so they must not want the same hour: offsets are spaced
 * two apart because the maths test books two hours.
 */
function slotOffset(testIndex: number): number {
  const project = test.info().project.name === "mobile" ? 1 : 0;
  return (testIndex * 2 + project) * 2;
}

/**
 * The local database keeps every booking these tests make, so a fixed day
 * fills up across runs. Pick whichever day currently has the most free
 * slots; sweep with `manage.py delete_test_users --prefix e2e-` when needed.
 */
async function pickEmptiestDay(page: Page): Promise<string> {
  const days = page.getByRole("list", { name: "Days" }).getByRole("button");
  await expect(days.first()).toBeVisible();
  const n = await days.count();
  let best = -1;
  let bestFree = -1;
  for (let i = 0; i < n; i++) {
    const text = (await days.nth(i).textContent()) ?? "";
    const m = /(\d+) free/.exec(text);
    const free = m ? Number(m[1]) : 0;
    if (free > bestFree) {
      bestFree = free;
      best = i;
    }
  }
  expect(bestFree, "no day with free slots in the window — sweep e2e bookings").toBeGreaterThan(7);
  const label = ((await days.nth(best).textContent()) ?? "").replace(/\d+ free$/, "").trim();
  await days.nth(best).click();
  return label;
}

/** Click a specific day by its visible label (e.g. "Mon 26 Oct"). */
async function pickDay(page: Page, label: string) {
  const days = page.getByRole("list", { name: "Days" }).getByRole("button");
  await expect(days.first()).toBeVisible();
  await days.filter({ hasText: label }).first().click();
}

async function chooseEverything(page: Page, offset: number) {
  await page.goto("/customer/book");
  await page.getByRole("button", { name: /Studio A/ }).click();
  await page.getByRole("button", { name: /Engineer One/ }).click();
  await page.getByRole("button", { name: /Recording session/ }).click();

  const day = await pickEmptiestDay(page);

  const slots = page.getByRole("list", { name: "Start times" }).getByRole("button", { disabled: false });
  await expect(slots.first()).toBeVisible();
  const slot = slots.nth(offset);
  const label = (await slot.textContent())?.trim();
  await slot.click();
  return { day, slot: label };
}

test("customer books a session and gets a reference; summary maths is right", async ({ page }) => {
  await registerCustomer(page);
  await chooseEverything(page, slotOffset(0));

  // 2 hours at GHS 200/hr (seeded Studio A) = GHS 400.00, mirrored live.
  await page.getByRole("button", { name: "Increase by 1 hour" }).click();
  await expect(page.getByTestId("summary-total")).toHaveText("GHS 400.00");

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/engineer should know/i).fill("Bring a cajon");
  await page.getByRole("button", { name: "Confirm booking" }).click();

  const ref = page.getByTestId("booking-reference");
  await expect(ref).toBeVisible();
  await expect(ref).toHaveText(/^ONA-[0-9A-F]{6}$/);
  await expect(page.getByText(/GHS 400\.00/)).toBeVisible();
});

test("the same slot cannot be booked twice — the second attempt is refused politely", async ({ page, browser }) => {
  await registerCustomer(page);
  const { day, slot: taken } = await chooseEverything(page, slotOffset(1));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByTestId("booking-reference")).toBeVisible();

  // Second customer, fresh session, sees that slot as booked.
  const ctx = await browser.newContext({ viewport: page.viewportSize() });
  const other = await ctx.newPage();
  await registerCustomer(other);
  await other.goto("/customer/book");
  await other.getByRole("button", { name: /Studio A/ }).click();
  await other.getByRole("button", { name: /Engineer One/ }).click();
  await other.getByRole("button", { name: /Recording session/ }).click();
  await pickDay(other, day);

  const slotList = other.getByRole("list", { name: "Start times" });
  const takenButton = slotList.getByRole("button", { name: new RegExp(`^${taken?.split(/\s/)[0]}`) });
  await expect(takenButton).toBeDisabled();
  await expect(takenButton).toContainText(/booked/i);
  await ctx.close();
});
