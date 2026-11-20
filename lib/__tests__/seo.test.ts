import { afterEach, describe, expect, it, vi } from "vitest";

import type { ContactDetails } from "@/lib/api/content";
import type { Service } from "@/lib/api/studio";

/** lib/site.ts reads the environment once, on import: load fresh per case. */
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string);
  const robots = (await import("@/app/robots")).default;
  const sitemap = (await import("@/app/sitemap")).default;
  const data = await import("@/lib/structured-data");
  return { robots, sitemap, ...data };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("robots.txt and sitemap.xml", () => {
  it("keep staging and previews out of search entirely", async () => {
    const { robots, sitemap } = await load({ NEXT_PUBLIC_ENVIRONMENT: "staging", NEXT_PUBLIC_SITE_URL: "https://staging.example" });
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(robots().sitemap).toBeUndefined();
    expect(sitemap()).toEqual([]);
  });

  it("in production, list only the public pages on the configured domain", async () => {
    const { robots, sitemap } = await load({ NEXT_PUBLIC_ENVIRONMENT: "production", NEXT_PUBLIC_SITE_URL: "https://ona.example/" });
    expect(robots().sitemap).toBe("https://ona.example/sitemap.xml");
    const urls = sitemap().map((e) => e.url);
    expect(urls).toEqual([
      "https://ona.example",
      "https://ona.example/studio",
      "https://ona.example/faqs",
      "https://ona.example/contact",
      "https://ona.example/legal/terms",
      "https://ona.example/legal/privacy",
    ]);
    expect(urls.some((u) => /admin|customer|login|register/.test(u))).toBe(false);
  });

  it("crawls sign-in pages (so their noindex is seen) but never the portals", async () => {
    const { robots } = await load({ NEXT_PUBLIC_ENVIRONMENT: "production" });
    const rules = robots().rules as { disallow: string[] };
    expect(rules.disallow).toEqual(expect.arrayContaining(["/admin", "/customer", "/pro"]));
    expect(rules.disallow).not.toContain("/login");
  });
});

describe("structured data", () => {
  it("leaves out contact details ONA has not entered, rather than guessing", async () => {
    const { businessJsonLd } = await load({ NEXT_PUBLIC_SITE_URL: "https://ona.example" });
    const empty = businessJsonLd({ phone: "", whatsapp: "", email: "", address: "", directions_url: "" });
    expect(empty).not.toHaveProperty("telephone");
    expect(empty).not.toHaveProperty("email");
    expect(empty).not.toHaveProperty("hasMap");
    expect(empty.address).toEqual({ "@type": "PostalAddress", addressLocality: "Accra", addressCountry: "GH" });

    const contact: ContactDetails = {
      phone: "030 222 0000", whatsapp: "", email: "hello@ona.example", address: "1 Studio Road", directions_url: "",
    };
    const full = businessJsonLd(contact);
    expect(full).toMatchObject({ telephone: "030 222 0000", email: "hello@ona.example", url: "https://ona.example" });
    expect(businessJsonLd(null)).not.toHaveProperty("telephone");
  });

  it("prices services in cedis from pesewas, and says nothing when there are none", async () => {
    const { servicesJsonLd } = await load({});
    const s = { name: "Mixing", description: "", base_price_pesewas: 150000, unit_label: "per song", category: "Post" } as Service;
    const out = servicesJsonLd([s]) as { itemListElement: { price: string; priceCurrency: string; itemOffered: object }[] };
    expect(out.itemListElement[0]).toMatchObject({ price: "1500.00", priceCurrency: "GHS" });
    expect(out.itemListElement[0].itemOffered).not.toHaveProperty("description");
    expect(servicesJsonLd([])).toBeNull();
  });

  it("builds an FAQPage only when there are published answers", async () => {
    const { faqJsonLd } = await load({});
    expect(faqJsonLd(null)).toBeNull();
    expect(faqJsonLd([])).toBeNull();
    expect(faqJsonLd([{ id: "1", question: "Q?", answer: "A." }])).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [{ name: "Q?", acceptedAnswer: { text: "A." } }],
    });
  });
});
