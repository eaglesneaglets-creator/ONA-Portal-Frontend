/**
 * Staff-edited site content, loaded on the server for public pages (Task 16).
 * Same rules as the catalogue loader (lib/api/studio.ts): plain fetch, no
 * token, ISR every 60s, and it fails soft.
 */

import { SERVER_API_URL } from "@/lib/api/studio";

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

/** Published FAQs, or null when the API could not be reached. */
export async function fetchFaqs(): Promise<Faq[] | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}/content/faqs/`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      // 30s: with stale-while-revalidate the first visitor after an edit can
      // still get the old copy, so keep the window short (QA F9).
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Faq[];
  } catch {
    return null;
  }
}

export interface ContactDetails {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  directions_url: string;
}

/** ONA's contact details as staff entered them, or null when the API could not be reached. */
export async function fetchContact(): Promise<ContactDetails | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}/content/contact/`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ContactDetails;
  } catch {
    return null;
  }
}
