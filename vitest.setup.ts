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
