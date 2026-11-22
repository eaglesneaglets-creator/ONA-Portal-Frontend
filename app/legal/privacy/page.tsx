import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/public/legal-page";
import { publicPage } from "@/lib/site";

/**
 * /legal/privacy — what ONA collects, why, who else sees it, and for how long.
 *
 * Written from what the system actually does (audited 2026-11-18), not from a
 * template: every statement here is true of the code. ONA must read and
 * approve it before launch, and any change to how data is handled must
 * change this page in the same deploy. Static on purpose, like the terms.
 *
 * Facts this page depends on — keep them true:
 *   - ID photos/selfie deleted KYC_RETENTION_DAYS after the decision
 *     (KYC service env KYC_DOCUMENT_RETENTION_DAYS must equal it)
 *   - payments through Paystack; email through Google Workspace
 *   - one sign-in token in localStorage; no analytics or advertising cookies
 *   - files stored in a bucket in the United States (Railway, region iad)
 */

export const metadata: Metadata = publicPage({
  title: "Privacy policy",
  description:
    "What ONA Records collects, why, who else sees it and how long it is kept.",
  path: "/legal/privacy",
});

const UPDATED = "18 November 2026";
const KYC_RETENTION_DAYS = 90;

const SECTIONS: LegalSection[] = [
  {
    title: "1. Who we are",
    points: [
      <>ONA Records Creative Services runs a recording studio in Tema and this booking site. We decide how the information on this page is used, which makes us responsible for it under Ghana&apos;s Data Protection Act, 2012 (Act 843).</>,
      <>To ask anything about your information, use the details on our <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">contact page</Link>.</>,
    ],
  },
  {
    title: "2. What we collect",
    points: [
      "Your account: name, email address, phone number, and your password — stored only in a scrambled form we cannot read back.",
      "Your bookings: the room, engineer, service, date and time you choose, and any changes or cancellations.",
      "Your payments: amounts, dates and the payment reference. Mobile Money and card details are entered with Paystack, not with us; we never see your full card number or PIN.",
      "If you verify your identity: the name and date of birth you enter, your ID type and number, photos of your ID and a selfie.",
      "Security records: sign-in attempts, the internet (IP) address a request came from, and a log of what our staff do in the console.",
      "Emails we send you: which message went out and when, so we do not send the same one twice.",
    ],
  },
  {
    title: "3. Why we use it",
    points: [
      "To take and manage your bookings, and to send confirmations, reminders and receipts.",
      "To take payments, issue invoices and receipts, and give refunds.",
      "To confirm who you are when you verify your identity, and to stop one ID being used for two accounts.",
      "To keep accounts safe — for example, locking sign-in after repeated wrong passwords.",
      "To keep the financial records the law requires of a business.",
      "We do not sell your information, and we do not use it for advertising.",
    ],
  },
  {
    title: "4. Who else sees it",
    points: [
      "ONA staff, as far as their work needs. Only the staff who review identity checks can see ID photos, and every time a check is opened it is recorded.",
      "Paystack, which processes online payments.",
      "Google, which delivers the emails we send you.",
      "Our hosting providers, which run our servers and store files for us.",
      "A separate identity-checking system that keeps ID documents apart from the rest of our records. It is used only to check identities.",
      "Authorities, if the law requires us to share something.",
    ],
  },
  {
    title: "5. Where it is stored",
    points: [
      "Our servers and file storage are run by cloud providers outside Ghana, including in the United States. Information travels to them over encrypted connections.",
    ],
  },
  {
    title: "6. How long we keep it",
    points: [
      "Your account, for as long as it is open.",
      "Bookings, payments, invoices and receipts, for as long as the law requires a business to keep financial records.",
      `Photos of your ID and your selfie are deleted ${KYC_RETENTION_DAYS} days after the decision on your identity check. The result, and the details you typed, are kept; the ID number is stored encrypted.`,
    ],
  },
  {
    title: "7. How we protect it",
    points: [
      "Every page and connection uses encryption (HTTPS).",
      "Passwords are stored scrambled; ID numbers are stored encrypted.",
      "Staff sign-in is limited and every staff action on money and identity checks is logged.",
    ],
  },
  {
    title: "8. What your browser keeps",
    points: [
      "One sign-in token in your browser's storage, so you stay signed in. Signing out removes it.",
      "We use no advertising or tracking cookies and no analytics tools.",
    ],
  },
  {
    title: "9. Your rights",
    intro: "Under the Data Protection Act, 2012 you can ask us to:",
    points: [
      "Show you the information we hold about you.",
      <>Correct it — you can change your name and phone number yourself in <Link href="/customer/settings" className="font-semibold text-ink underline underline-offset-4">Settings</Link>.</>,
      "Delete it, except what the law requires us to keep (such as financial records).",
      "Stop using it for a particular purpose.",
      <>Ask through our <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">contact page</Link>. If you are unhappy with our answer, you can complain to Ghana&apos;s Data Protection Commission.</>,
    ],
  },
  {
    title: "10. Changes",
    points: [
      "When we change how we handle your information, we update this page and the date at the top.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Privacy" title="How ONA Records handles your information" updated={UPDATED} sections={SECTIONS} />
  );
}
