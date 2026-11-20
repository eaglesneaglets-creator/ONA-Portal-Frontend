import type { Metadata } from "next";

/** Every tab reads "<page> — ONA Records". */
export const TITLE_TEMPLATE = "%s — ONA Records";

/**
 * The title for a layout that has pages below it (/admin, /admin/bookings…).
 *
 * In Next, a layout whose title is a plain string resets the template for
 * everything beneath it, so /admin/bookings showed just "Bookings". Setting
 * the template again here keeps the suffix all the way down. A layout for a
 * single page can use a plain string.
 */
export function sectionTitle(title: string): Metadata["title"] {
  return { default: title, template: TITLE_TEMPLATE };
}
