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

export interface SocialLinks {
  instagram_url: string;
  facebook_url: string;
  linkedin_url: string;
  tiktok_url: string;
  youtube_url: string;
}

export interface ContactDetails extends SocialLinks {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  directions_url: string;
}

/** ONA's profiles that are filled in, in display order, with their network's name. */
export function socialProfiles(c: Partial<SocialLinks> | null): { name: string; url: string }[] {
  if (!c) return [];
  const all: [string, string | undefined][] = [
    ["Instagram", c.instagram_url],
    ["Facebook", c.facebook_url],
    ["TikTok", c.tiktok_url],
    ["YouTube", c.youtube_url],
    ["LinkedIn", c.linkedin_url],
  ];
  return all.filter((p): p is [string, string] => Boolean(p[1])).map(([name, url]) => ({ name, url }));
}

/** An image from the media library, as the API describes it. */
export interface SiteImage {
  id: string;
  /** A path on the API, e.g. /api/v1/content/media/<id>/ — see mediaSrc(). */
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface SiteContent {
  hero: { eyebrow: string; title: string; body: string; image: SiteImage | null; focus: number };
  gallery: { id: string; caption: string; image: SiteImage }[];
  reviews: { id: string; quote: string; author: string; rating: number | null; source: "google" | "facebook" | "direct" }[];
  google: { rating: string; count: number; url: string } | null;
}

/** The homepage hero, gallery, reviews and Google rating, or null when the API could not be reached. */
export async function fetchSite(): Promise<SiteContent | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}/content/site/`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as SiteContent;
  } catch {
    return null;
  }
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
