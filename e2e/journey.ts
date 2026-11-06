import { expect, type Page } from "@playwright/test";

/**
 * The new-customer journey, from a test's point of view.
 *
 * A fresh sign-up lands on /welcome and a first visit to the booking page or
 * the admin console opens a spotlight tour. Specs about other things pass
 * through both the way a hurried person would: skip the welcome, close tours.
 */

/** After the register button: the welcome flow, skipped, then the dashboard. */
export async function passWelcome(page: Page) {
  await expect(page).toHaveURL(/\/welcome$/);
  await page.getByTestId("welcome-skip").click();
  await expect(page).toHaveURL(/\/customer(\/|$)/);
}

/** Close any spotlight tour the moment it covers something a test wants. */
export async function dismissTours(page: Page) {
  await page.addLocatorHandler(page.getByRole("button", { name: "Skip the tour" }), async (skip) => {
    await skip.click();
  });
}
