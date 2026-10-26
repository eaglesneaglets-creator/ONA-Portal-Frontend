import type { Metadata } from "next";
import Link from "next/link";

import { LandingFaq } from "@/components/landing/faq";
import { SiteFooter } from "@/components/public/site-footer";
import { BOOK_HREF, SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";
import { fetchFaqs } from "@/lib/api/content";

/**
 * /faqs — every published answer (Task 16). Staff edit them in the console;
 * this page picks changes up within a minute (ISR).
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Questions",
  description: "Answers about booking studio time at ONA Records in Accra — engineers, payment, changes and paperwork.",
};

export default async function FaqsPage() {
  const faqs = await fetchFaqs();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-[clamp(72px,10vw,128px)] sm:px-6">
        <section className="py-12 sm:py-16">
          <p className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.14em] text-ona-red">Questions</p>
          <h1 className="mb-3 text-[clamp(30px,5vw,44px)] font-black leading-tight tracking-tight text-ink">
            Good to know before you book
          </h1>
          <p className="text-[16px] leading-relaxed text-ink-dim">
            Anything not here? Book a session and add a note — ONA reads every one.
          </p>
        </section>
        {faqs === null ? (
          <p className="rounded-xl border border-border-default bg-surface px-6 py-10 text-center text-[15px] text-ink-dim">
            The answers are taking a moment to load. Please try again shortly.
          </p>
        ) : faqs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-default px-6 py-10 text-center text-[15px] text-ink-mute">
            No questions are published right now.
          </p>
        ) : (
          <LandingFaq items={faqs} />
        )}
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="h-12 px-6 font-bold">
            <Link href={BOOK_HREF}>Book studio time</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 px-6 font-bold">
            <Link href="/studio">See rooms &amp; prices</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
