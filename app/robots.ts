import type { MetadataRoute } from "next";

import { IS_PRODUCTION, SITE_URL } from "@/lib/site";

/**
 * /robots.txt. Only production may be indexed; staging and previews say
 * "nothing here" so test bookings never turn up in search results.
 *
 * In production the portals (/admin, /customer, /pro) are not crawled at
 * all. Sign-in and account pages ARE crawlable on purpose: they carry a
 * `noindex` tag, and a crawler can only obey that tag if it may fetch the
 * page. Blocking them here instead could leave a bare "/login" result with
 * no description, because the homepage links to it.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/customer", "/pro", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
