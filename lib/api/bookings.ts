/**
 * Bookings and the calendar — browser-side, through the authenticated client.
 *
 * lib/api/studio.ts is the server-side catalogue loader for the public page.
 * This file is what the booking flow (a client component inside the customer
 * portal) uses: the calendar is public but fetched from the browser as the
 * customer clicks around, and creating a booking needs the access token.
 */

import { api } from "@/lib/api/client";
import type { Engineer, Room, Service } from "@/lib/api/studio";

/** "past" = already started; not one of the four SRS states, never bookable. */
export type SlotState = "available" | "booked" | "maintenance" | "holiday" | "past";

export interface Slot {
  start_at: string;
  end_at: string;
  state: SlotState;
}

export interface Calendar {
  from: string;
  to: string;
  room: string | null;
  engineer: string | null;
  slots: Slot[];
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Booking {
  id: string;
  reference: string;
  status: BookingStatus;
  room: Room;
  engineer: Engineer;
  service: Service;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  total_pesewas: number;
  total_display: string;
  notes: string;
  created_at: string;
}

export interface BookingInput {
  room: string;
  engineer: string;
  service: string;
  /** ISO datetime, on the hour, studio time. */
  start_at: string;
  hours: number;
  notes?: string;
}

interface Page<T> {
  count: number;
  results: T[];
}

export const STUDIO_TZ = "Africa/Accra";

export async function fetchCalendar(params: {
  room: string;
  engineer?: string;
  from: string;
  to: string;
}): Promise<Calendar> {
  const q = new URLSearchParams({ room: params.room, from: params.from, to: params.to });
  if (params.engineer) q.set("engineer", params.engineer);
  return api.get<Calendar>(`/studio/calendar/?${q}`, { anonymous: true });
}

export async function fetchCatalogueFromBrowser(): Promise<{
  rooms: Room[];
  engineers: Engineer[];
  services: Service[];
}> {
  const [rooms, engineers, services] = await Promise.all([
    api.get<Page<Room>>("/studio/rooms/?page_size=100", { anonymous: true }),
    api.get<Page<Engineer>>("/studio/engineers/?page_size=100", { anonymous: true }),
    api.get<Page<Service>>("/studio/services/?page_size=100", { anonymous: true }),
  ]);
  return { rooms: rooms.results, engineers: engineers.results, services: services.results };
}

export function createBooking(input: BookingInput): Promise<Booking> {
  // retries: 0 is the client default for mutations; stated here because a
  // replayed POST would be a second booking.
  return api.post<Booking>("/studio/bookings/", input, { retries: 0 });
}

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: STUDIO_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: STUDIO_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortDayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: STUDIO_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
export const fmtDay = (iso: string) => dayFmt.format(new Date(iso));
export const fmtShortDay = (iso: string) => shortDayFmt.format(new Date(iso));

/** YYYY-MM-DD in studio time, for the calendar query and for grouping. */
const isoDayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDIO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function studioDate(d: Date): string {
  // Formatter is built once: this runs for every slot (~170 per calendar).
  const parts = isoDayFmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Preview only. The API returns the authoritative total_display on the
 * created booking; this exists so the summary rail can update as the
 * customer changes hours without a round trip.
 */
export function previewGhs(pesewas: number): string {
  const whole = Math.floor(pesewas / 100);
  const part = pesewas % 100;
  return `GHS ${whole.toLocaleString("en-GB")}.${String(part).padStart(2, "0")}`;
}
