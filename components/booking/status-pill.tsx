import type { BookingStatus } from "@/lib/api/bookings";

/**
 * Booking status, as a pill. Colours use the signal tokens, whose contrast
 * ratios are recorded in app/globals.css; the word is always present, so
 * colour is never the only signal.
 */
const STYLES: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: "Awaiting confirmation", className: "bg-warn-bg text-warn" },
  confirmed: { label: "Confirmed", className: "bg-ok-bg text-ok" },
  cancelled: { label: "Cancelled", className: "bg-surface-sunk text-ink-mute" },
  completed: { label: "Completed", className: "bg-info-bg text-info" },
};

export function StatusPill({ status }: { status: BookingStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[11.5px] font-bold ${s.className}`}>
      {s.label}
    </span>
  );
}
