import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runner. Unit tests stay in vitest (jsdom); this drives a real browser
 * against a real Next server, and optionally a real backend.
 *
 * Two projects, not one: ADR-013 makes 390px the primary viewport, so every
 * journey runs at phone width AND desktop. A flow that only works with a
 * sidebar is a defect here, not a polish item.
 *
 * Specs that need the Django API skip themselves when it is unreachable
 * (see e2e/auth.spec.ts), so this suite is safe to run in CI with no
 * backend — the smoke tests still prove routing, guards and rendering.
 */
const isCI = !!process.env.CI;
const PORT = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      // 390x844 is the ADR-013 reference phone. Chromium only for now: the
      // point is layout and flow at phone width, not WebKit parity.
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  webServer: {
    // Dev server locally so edits are live; a production build in CI so
    // what is tested is what ships (static prerendering, no HMR shims).
    command: isCI ? "npm run build && npm run start" : "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
    },
  },
});
