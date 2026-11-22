import type { Metadata } from "next";

/**
 * Where this deployment lives, for every absolute URL search engines and
 * link previews need: canonical links, the sitemap, Open Graph images and
 * structured data.
 *
 * NEXT_PUBLIC_SITE_URL wins: set it to the production domain at cutover
 * (e.g. https://onarecords.com) and redeploy. Until then Railway's own domain
 * is used, and locally, localhost.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000")
).replace(/\/+$/, "");

export const SITE_NAME = "ONA Records";

/** Alt text of the share card (app/opengraph-image.tsx). */
export const OG_IMAGE_ALT = "ONA Records: book studio time in Tema";

/** Only production is indexed; staging and previews must never appear in search. */
export const IS_PRODUCTION = process.env.NEXT_PUBLIC_ENVIRONMENT === "production";

/**
 * Metadata for a public page: its title and description, its canonical URL
 * (so a link with ?utm_… or a trailing slash still counts as this page), and
 * the same words for the WhatsApp/X/Facebook preview. The preview image is
 * app/opengraph-image.tsx unless a page has its own.
 */
export function publicPage({
  title,
  description,
  path,
}: {
  title: string | { absolute: string };
  description: string;
  path: string;
}): Metadata {
  const ogTitle = typeof title === "string" ? `${title} — ${SITE_NAME}` : title.absolute;
  // Named explicitly: a page that sets its own openGraph no longer inherits
  // the card from app/opengraph-image.tsx, and would share with no picture.
  const images = [{ url: "/opengraph-image", width: 1200, height: 630, alt: OG_IMAGE_ALT }];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GH", url: path, title: ogTitle, description, images },
    twitter: { card: "summary_large_image", title: ogTitle, description, images },
  };
}

/** Signed-in areas and account pages: never in search results. */
export const PRIVATE_PAGE: Metadata = { robots: { index: false, follow: false } };

/** The public pages, in the order a visitor meets them. The sitemap lists exactly these. */
export const PUBLIC_PAGES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/studio", changeFrequency: "weekly", priority: 0.9 },
  { path: "/faqs", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.2 },
] as const;
