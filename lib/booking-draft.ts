/**
 * A booking the customer was confirming when their session ran out (T17 UAT:
 * "expired session mid-booking").
 *
 * Saved in sessionStorage — this tab only — at the moment they press
 * Confirm, and kept only if that attempt failed because they were signed
 * out. After signing in again the flow lands back on /customer/book and
 * offers the same room, engineer, service and time, re-checked against the
 * live calendar. Anything else (success, a taken slot) clears it.
 *
 * Storage can be unavailable (private mode, blocked site data): every access
 * is wrapped, and losing the draft only costs the customer a few clicks.
 */

const KEY = "ona.booking-draft";
const TTL_MS = 30 * 60 * 1000;

export interface BookingDraft {
  room: string;
  engineer: string;
  service: string;
  start_at: string;
  hours: number;
  notes: string;
}

export function saveDraft(draft: BookingDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    /* storage unavailable: nothing to keep */
  }
}

export function loadDraft(): BookingDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as BookingDraft & { savedAt?: number };
    if (!d.savedAt || Date.now() - d.savedAt > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    if (![d.room, d.engineer, d.service, d.start_at].every((v) => typeof v === "string")) return null;
    return { room: d.room, engineer: d.engineer, service: d.service, start_at: d.start_at, hours: Number(d.hours) || 1, notes: String(d.notes ?? "") };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
