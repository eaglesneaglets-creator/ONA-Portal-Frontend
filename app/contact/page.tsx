import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { dialable } from "@/lib/api/account";
import { type ContactDetails, fetchContact } from "@/lib/api/content";
import { publicPage } from "@/lib/site";
import { JsonLd } from "@/components/seo/json-ld";
import { businessJsonLd } from "@/lib/structured-data";

/**
 * /contact — how to reach ONA (P10). Staff keep the details in the console
 * (Questions & contact); this page shows only what they have entered and
 * never a made-up number. ISR: an edit shows within about a minute.
 */

export const revalidate = 60;

export const metadata: Metadata = publicPage({
  title: "Contact",
  description:
    "Call, WhatsApp, email or visit ONA Records in Accra.",
  path: "/contact",
});

interface Way {
  key: string;
  icon: typeof Phone;
  label: string;
  value: string;
  href: string;
  action: string;
  external?: boolean;
}

function ways(c: ContactDetails): Way[] {
  const out: Way[] = [];
  if (c.phone) out.push({ key: "phone", icon: Phone, label: "Call", value: c.phone, href: `tel:+${dialable(c.phone)}`, action: "Call ONA" });
  // Only when staff give one: the phone line may be a landline with no WhatsApp.
  if (c.whatsapp) out.push({ key: "whatsapp", icon: MessageCircle, label: "WhatsApp", value: c.whatsapp, href: `https://wa.me/${dialable(c.whatsapp)}`, action: "Message on WhatsApp", external: true });
  if (c.email) out.push({ key: "email", icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}`, action: "Send an email" });
  if (c.address) {
    out.push({
      key: "visit", icon: MapPin, label: "Visit", value: c.address,
      href: c.directions_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`,
      action: "Get directions", external: true,
    });
  }
  return out;
}

export default async function ContactPage() {
  const contact = await fetchContact();
  const list = contact ? ways(contact) : [];
  return (
    <>
      <JsonLd data={businessJsonLd(contact)} />
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-3xl px-4 pb-[clamp(72px,10vw,128px)] sm:px-6">
        <section className="py-12 sm:py-16">
          <p className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.14em] text-ona-red">Contact</p>
          <h1 className="mb-3 text-[clamp(30px,5vw,44px)] font-black leading-tight tracking-tight text-ink">
            Talk to ONA Records
          </h1>
          <p className="max-w-[60ch] text-[16px] leading-relaxed text-ink-dim">
            Questions about a session, a booking or a payment — reach the studio directly. For quick answers,
            see the <Link href="/faqs" className="font-semibold text-ink underline underline-offset-4">questions page</Link>.
          </p>
        </section>

        {list.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((w) => (
              <li key={w.key} className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface p-5">
                <span className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">
                  <w.icon aria-hidden="true" className="size-4 text-ona-red" />
                  {w.label}
                </span>
                <span className="text-[17px] font-bold break-words text-ink">{w.value}</span>
                <a
                  href={w.href}
                  {...(w.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-lg border border-border-default px-4 text-[14.5px] font-semibold text-ink hover:bg-surface-sunk"
                >
                  {w.action}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-border-default bg-surface px-5 py-4 text-[15px] leading-relaxed text-ink-dim">
            {contact === null
              ? "The contact details could not be loaded just now. Please try again in a moment."
              : "ONA's phone number and address are being added to this page."}
          </p>
        )}

        <p className="mt-10 text-[14px] leading-relaxed text-ink-mute">
          How we handle what you share with us is in our{" "}
          <Link href="/legal/privacy" className="font-semibold text-ink underline underline-offset-4">privacy policy</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
