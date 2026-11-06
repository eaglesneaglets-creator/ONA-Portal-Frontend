/**
 * Test setup, applied to every file.
 *
 * Importing this registers Testing Library's afterEach cleanup, which
 * unmounts whatever the previous test rendered. Without it, renders
 * accumulate in one document and later tests fail with "Found multiple
 * elements" — an error that points at the assertion rather than at the
 * missing teardown.
 */
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

/**
 * jsdom has no matchMedia. The shadcn sidebar asks it whether the viewport is
 * a phone (hooks/use-mobile.ts). Default: desktop. A test can emulate a phone
 * with `setViewportMobile(true)` before rendering.
 */
let mobile = false;
export function setViewportMobile(value: boolean): void {
  mobile = value;
}
afterEach(() => {
  mobile = false;
});
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("max-width") ? mobile : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});
