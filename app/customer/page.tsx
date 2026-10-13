import Link from "next/link";

export default function CustomerHome() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-black tracking-tight text-ink">Your workspace</h1>
      <p className="mb-6 text-ink-dim">
        Your bookings, invoices and payments will appear here. Start with a session.
      </p>
      <Link
        href="/customer/book"
        className="inline-flex min-h-[var(--tap-min)] items-center rounded-md bg-ona-red px-6 font-bold text-white transition-colors hover:bg-ona-tertiary"
      >
        Book a session
      </Link>
    </div>
  );
}
