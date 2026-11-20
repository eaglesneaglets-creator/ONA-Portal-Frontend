import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/public/legal-page";
import { publicPage } from "@/lib/site";

/**
 * /legal/terms — ONA Records' booking terms, as ONA supplied them
 * (November 2026). Published as written; the only edits are dropping a
 * no-show line that appeared word for word in two sections, and splitting
 * the list into headed sections for reading on a phone.
 *
 * Static on purpose: legal wording changes by a deliberate deploy, not a
 * console edit, so there is always a record of which version applied when.
 */

export const metadata: Metadata = publicPage({
  title: "Booking terms",
  description:
    "ONA Records' booking, deposit, cancellation and studio terms.",
  path: "/legal/terms",
});

const UPDATED = "4 November 2026";

const SECTIONS: LegalSection[] = [
  {
    title: "1. Deposits and retainer fees",
    points: [
      "The 50% deposit required to secure your session time acts as a non-refundable retainer.",
      "Once a session is successfully completed, all related fees are non-refundable.",
    ],
  },
  {
    title: "2. Cancellation and rescheduling",
    points: [
      "Greater than 48 hours' notice: the initial 50% deposit will be fully transferred to the new date and time.",
      "Less than 48 hours' notice: cancellations or rescheduling requests made within 48 hours of the scheduled start time forfeit the 50% deposit, and a new deposit will be required to book a future date.",
      "No-shows: if a client fails to show up to a scheduled session within the first 30 minutes of the start time without prior notification, the session is considered cancelled and the deposit is forfeited.",
    ],
  },
  {
    title: "3. Grace period and overtime",
    points: [
      "A 15-minute grace period is provided following the conclusion of your scheduled session.",
      "If a session extends beyond this 15-minute grace period, an additional full-hour fee will be automatically applied to the total bill.",
    ],
  },
  {
    title: "4. Deliverables and revisions",
    points: [
      "Once digital files, master tapes, or multimedia assets are approved and delivered to the client, no refunds will be issued.",
      "If a deliverable contains a defect or fails to meet the specifications agreed upon, ONA Records will provide complimentary revisions to correct the error, rather than a financial refund.",
    ],
  },
  {
    title: "5. Property damage",
    points: [
      "ONA Records reserves the right to cancel a session immediately, without a refund of any paid amounts, if a client or their guests engage in hazardous behaviour, illegal activity, or cause intentional damage to studio property and equipment.",
      "All damages are payable.",
    ],
  },
  {
    title: "6. Personal items, lost and found",
    points: [
      "Clients and guests are solely responsible for their personal belongings while on the premises.",
      "Management assumes no responsibility or liability for lost, stolen, damaged, or misplaced personal items.",
      "Any items found on the premises will be placed in the lost and found for 14 days, after which unclaimed items will be disposed of or donated.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Terms" title="ONA Records booking terms" updated={UPDATED} sections={SECTIONS}>
      <p className="mt-10 rounded-xl border border-border-default bg-surface px-5 py-4 text-[15px] leading-relaxed text-ink">
        By completing your 50% deposit payment to ONA Records, you formally acknowledge that you have read,
        understood, and agreed to the terms of this booking and refund policy.
      </p>
    </LegalPage>
  );
}
