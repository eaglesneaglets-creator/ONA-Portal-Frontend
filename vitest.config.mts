import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",

    // Playwright owns e2e/. Without this, vitest picks up *.spec.ts there
    // and fails on @playwright/test imports.
    exclude: ["e2e/**", "node_modules/**", ".next/**"],

    // Required for Testing Library's automatic cleanup.
    //
    // RTL unmounts each render in an afterEach hook, which it can only
    // register when the globals exist. Without this, every render() in a
    // file stacks into the same document and the second test onward fails
    // with "Found multiple elements" — a confusing error whose cause is
    // nowhere near where it surfaces.
    globals: true,

    setupFiles: ["./vitest.setup.ts"],

    // The pre-push hook runs while the dev server, backends and Docker are
    // busy. With one worker per core (11 on a 12-thread machine) workers
    // missed their start-up deadline ("Timeout waiting for worker to
    // respond") and slow renders hit the 5 s test limit, blocking pushes
    // with no real failure. Fewer workers and a roomier limit keep the
    // suite honest without being flaky; CI machines are smaller anyway.
    maxWorkers: 4,
    testTimeout: 15_000,
  },
});
