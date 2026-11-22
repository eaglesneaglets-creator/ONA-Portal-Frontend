import { ApiError } from "@/lib/api/errors";

/**
 * The most specific sentence the API gave for a failed save: its own
 * message ("This image is still shown on the homepage hero…"), else the
 * first field message ("That image is too large…"), else the generic one.
 */
export function apiMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.formError && err.formError !== err.message) return err.formError;
    const first = Object.values(err.fieldErrors)[0];
    if (first) return String(Array.isArray(first) ? first[0] : first);
    return err.message || fallback;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}
