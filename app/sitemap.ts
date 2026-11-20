import type { MetadataRoute } from "next";

import { IS_PRODUCTION, PUBLIC_PAGES, SITE_URL } from "@/lib/site";

/**
 * /sitemap.xml: the public pages, and only in production (staging lists
 * nothing, matching its robots.txt). Signed-in areas are never listed.
 * No lastModified: a date the code cannot know would only mislead crawlers.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!IS_PRODUCTION) return [];
  return PUBLIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path === "/" ? "" : p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
