"use client";

/**
 * Landing FAQ — adapted from the free shadcnspace block `faq-01`
 * (@shadcn-space/faq-01): bordered accordion items, a plus that turns into
 * a cross, a filled background on the open item. Re-coloured onto the ONA
 * tokens and stripped of its entrance animations and @iconify dependency.
 *
 * The answers are staff-edited content (Task 16, /admin/content), loaded on
 * the server — this component only lays them out.
 */

import { PlusIcon } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Faq } from "@/lib/api/content";

export function LandingFaq({ items }: { items: Faq[] }) {
  return (
    <Accordion type="single" collapsible className="flex flex-col gap-3">
      {items.map((item, i) => (
        <AccordionItem
          key={item.id}
          value={`faq-${i}`}
          className="group/item rounded-xl border border-border-default bg-surface px-5 py-1 transition-colors not-last:border-b data-[state=open]:bg-surface-alt sm:px-6"
        >
          <AccordionTrigger className="min-h-[var(--tap-min)] items-center gap-4 py-4 text-[16px] font-bold text-ink hover:no-underline sm:text-[17px] **:data-[slot=accordion-trigger-icon]:hidden">
            {item.question}
            <PlusIcon
              aria-hidden="true"
              className="size-5 shrink-0 text-ona-red transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-45"
            />
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-[15px] leading-relaxed text-ink-dim">{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
