/**
 * schema.org data for search engines, built only from what ONA has entered:
 * the contact details staff keep in the console, the live price list and
 * the published answers. A field ONA has not filled in is left out, never
 * guessed — a wrong phone number in Google is worse than none.
 *
 * Check a page with https://search.google.com/test/rich-results.
 */
import { socialProfiles, type ContactDetails, type Faq } from "@/lib/api/content";
import type { Service } from "@/lib/api/studio";
import { SITE_NAME, SITE_URL } from "@/lib/site";

type Json = Record<string, unknown>;

const BUSINESS_ID = `${SITE_URL}/#business`;

/** Drops empty strings, nulls and empty objects/arrays, so absent facts stay absent. */
function compact<T extends Json>(o: T): T {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => {
      if (v === null || v === undefined || v === "") return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") return Object.keys(v as Json).some((k) => !k.startsWith("@"));
      return true;
    }),
  ) as T;
}

/**
 * ONA as a local business: what Google shows for "recording studio Tema".
 *
 * Tema, as on ONA's Google Business Profile: a business whose site and
 * listing name different towns ranks worse locally. Accra stays an area
 * served, so searches for either still match. `sameAs` names ONA's own
 * profiles, so Google can tie them to this business. No rating or review
 * markup: Google does not show stars a business publishes about itself.
 */
export function businessJsonLd(contact: ContactDetails | null, heroImage?: string): Json {
  return compact({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": BUSINESS_ID,
    name: SITE_NAME,
    legalName: "ONA Records Creative Services",
    description: "Recording rooms and engineers to book by the hour in Tema, paid by Mobile Money.",
    url: SITE_URL,
    logo: `${SITE_URL}/ona-icon.png`,
    image: heroImage ?? `${SITE_URL}/hero-studio.jpg`,
    telephone: contact?.phone ?? "",
    email: contact?.email ?? "",
    address: compact({
      "@type": "PostalAddress",
      streetAddress: contact?.address ?? "",
      addressLocality: "Tema",
      addressRegion: "Greater Accra",
      addressCountry: "GH",
    }),
    hasMap: contact?.directions_url ?? "",
    areaServed: [
      { "@type": "City", name: "Tema" },
      { "@type": "City", name: "Accra" },
    ],
    sameAs: socialProfiles(contact).map((p) => p.url),
    currenciesAccepted: "GHS",
    paymentAccepted: "Mobile Money",
  });
}

/** The price list on /studio: each service with its real price in cedis. */
export function servicesJsonLd(services: Service[]): Json | null {
  if (!services.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Studio services and prices",
    url: `${SITE_URL}/studio`,
    itemListElement: services.map((s) =>
      compact({
        "@type": "Offer",
        price: (s.base_price_pesewas / 100).toFixed(2),
        priceCurrency: "GHS",
        description: s.unit_label,
        seller: { "@id": BUSINESS_ID },
        itemOffered: compact({ "@type": "Service", name: s.name, description: s.description, category: s.category }),
      }),
    ),
  };
}

/** The published answers on /faqs. */
export function faqJsonLd(faqs: Faq[] | null): Json | null {
  if (!faqs?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
