/**
 * The booking preview's price — a mirror of the backend's apps/studio/pricing.py.
 *
 * ONA prices by service: per hour, per 8-hour day, per song or per track.
 * For songs and tracks the studio time reserves the room but is not charged
 * on top. A room may carry an optional hire rate, added per hour.
 *
 * The server prices the booking again when it is made and that figure is the
 * one that counts; this only keeps the summary honest while the customer
 * chooses. Integer pesewas throughout.
 */

import type { Room, Service } from "@/lib/api/studio";

export const DAY_HOURS = 8;
export const MAX_QUANTITY = 20;
/** Mirrors BOOKING_DEPOSIT_PERCENT; the booking's own deposit comes from the API. */
export const DEPOSIT_PERCENT = 50;

export const isPerItem = (s: Pick<Service, "price_unit">) => s.price_unit === "song" || s.price_unit === "track";
export const isDay = (s: Pick<Service, "price_unit">) => s.price_unit === "day";

export function quotePesewas(
  room: Pick<Room, "hourly_rate_pesewas">,
  service: Pick<Service, "price_unit" | "base_price_pesewas">,
  hours: number,
  quantity = 1,
): number {
  const price = service.base_price_pesewas;
  let servicePart: number;
  if (service.price_unit === "hour") servicePart = price * hours;
  else if (service.price_unit === "day") servicePart = price * Math.floor(hours / DAY_HOURS);
  else servicePart = price * quantity;
  return servicePart + (room.hourly_rate_pesewas ?? 0) * hours;
}

/** 50% of the total, rounded up to the pesewa — never less than the stated share. */
export function depositPesewas(total: number, percent = DEPOSIT_PERCENT): number {
  return Math.ceil((total * percent) / 100);
}

/** "song" -> "songs" for the quantity stepper. */
export function unitNoun(s: Pick<Service, "price_unit">, n: number): string {
  const word = s.price_unit === "track" ? "track" : "song";
  return n === 1 ? word : `${word}s`;
}
