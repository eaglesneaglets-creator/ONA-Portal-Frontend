import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",

    // Required for Testing Library's automatic cleanup.
    //
    // RTL unmounts each render in an afterEach hook, which it can only
    // register when the globals exist. Without this, every render() in a
    // file stacks into the same document and the second test onward fails
    // with "Found multiple elements" — a confusing error whose cause is
    // nowhere near where it surfaces.
    globals: true,

    setupFiles: ["./vitest.setup.ts"],
  },
});
