"use client";

/**
 * Landing FAQ — adapted from the free shadcnspace block `faq-01`
 * (@shadcn-space/faq-01): bordered accordion items, a plus that turns into
 * a cross, a filled background on the open item. Re-coloured onto the ONA
 * tokens and stripped of its entrance animations and @iconify dependency.
 *
 * Every answer states current policy and nothing more. Questions whose
 * answers ONA has not decided (refund window, commission, address) are not
 * here — a wrong answer in an FAQ is a promise someone will hold us to.
 * Task 16 moves these into staff-editable content.
 */

import { PlusIcon } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ = [
  {
    q: "Is an engineer included?",
    a: "Yes. Every room booking comes with an engineer, and you choose who when you book.",
  },
  {
    q: "How do I pay?",
    a: "In Ghana cedis, through ONA — by Mobile Money, card or bank transfer. You never pay an engineer or anyone else directly.",
  },
  {
    q: "When is my slot really mine?",
    a: "The moment you confirm. Two bookings can never hold the same room or engineer at the same time — the system refuses it, not just the form. ONA then confirms the session with you.",
  },
  {
    q: "Can I move or cancel a booking?",
    a: "Yes. Until your session starts, you can reschedule or cancel from your bookings page, and the slot is released for someone else.",
  },
  {
    q: "What do I get when I book?",
    a: "A booking reference straight away, an invoice by email, a receipt once your payment is confirmed, and a reminder the day before your session.",
  },
  {
    q: "Can ONA find me a producer or session musician?",
    a: "Tell us in the notes when you book, and ONA staff can arrange a vetted professional for your session. Browsing and hiring professionals yourself arrives in a later release.",
  },
];

export function LandingFaq() {
  return (
    <Accordion type="single" collapsible className="flex flex-col gap-3">
      {FAQ.map((item, i) => (
        <AccordionItem
          key={item.q}
          value={`faq-${i}`}
          className="group/item rounded-xl border border-border-default bg-surface px-5 py-1 transition-colors not-last:border-b data-[state=open]:bg-surface-alt sm:px-6"
        >
          <AccordionTrigger className="min-h-[var(--tap-min)] items-center gap-4 py-4 text-[16px] font-bold text-ink hover:no-underline sm:text-[17px] **:data-[slot=accordion-trigger-icon]:hidden">
            {item.q}
            <PlusIcon
              aria-hidden="true"
              className="size-5 shrink-0 text-ona-red transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-45"
            />
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-[15px] leading-relaxed text-ink-dim">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
