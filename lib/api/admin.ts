/**
 * The staff console API — /api/v1/admin/ (Task 14).
 *
 * Every endpoint here is ONA-staff only; the backend enforces it
 * (IsONAAdmin), the admin layout's RequireAuth only keeps others out of the
 * UI. Money arrives as integer pesewas with a server-formatted `_display`
 * string beside it — the browser never does money arithmetic.
 */

import { api } from "@/lib/api/client";
import type { Booking } from "@/lib/api/bookings";

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CustomerBrief {
  id: string;
  public_ref: number | null;
  name: string;
  email: string;
  phone: string;
}

export type BookingAction = "confirm" | "complete" | "cancel";

export interface StaffBooking extends Booking {
  customer: CustomerBrief;
  paid_pesewas: number;
  refunded_pesewas: number;
  /** Net of refunds. */
  paid_display: string;
  status_display: string;
  allowed_actions: BookingAction[];
  updated_at: string;
}

export interface Commission {
  percent: number;
  amount_pesewas: number;
  amount_display: string;
}

export interface LedgerEntry {
  id: string;
  entry_type: "hold" | "release" | "refund";
  entry_type_display: string;
  amount_pesewas: number;
  amount_display: string;
  beneficiary: string;
  beneficiary_display: string;
  created_at: string;
  created_by_email: string | null;
  note: string;
  commission: Commission | null;
}

export interface StaffTransaction {
  id: string;
  booking: { id: string; reference: string };
  customer: { id: string; name: string; email: string };
  provider: "hubtel" | "manual";
  provider_display: string;
  provider_ref: string | null;
  amount_pesewas: number;
  amount_display: string;
  status: "pending" | "succeeded" | "failed";
  status_display: string;
  failure_reason: string;
  commission_percent: number;
  held_pesewas: number;
  held_display: string;
  commission_pesewas: number;
  created_at: string;
  ledger: LedgerEntry[];
}

export interface HistoryEntry {
  action: string;
  actor_email: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface StaffBookingDetail extends StaffBooking {
  transactions: StaffTransaction[];
  history: HistoryEntry[];
}

export interface StaffCustomer {
  id: string;
  public_ref: number | null;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_email_verified: boolean;
  date_joined: string;
  booking_count: number;
  upcoming_count: number;
  last_session_at: string | null;
  paid_pesewas: number;
  paid_display: string;
}

export interface Overview {
  today_count: number;
  pending_count: number;
  week_count: number;
  week_hours: number;
  customers_total: number;
  customers_new_30d: number;
  received_30d_pesewas: number;
  received_30d_display: string;
  commission_30d_pesewas: number;
  commission_30d_display: string;
  needs_confirmation: StaffBooking[];
  today: StaffBooking[];
}

type Query = Record<string, string | number | undefined | null>;

function qs(params: Query): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const PAGE_SIZE = 20;

export const adminApi = {
  overview: () => api.get<Overview>("/admin/overview/"),

  bookings: (q: { when?: "upcoming" | "past" | "today"; status?: string; search?: string; customer?: string; page?: number }) =>
    api.get<Page<StaffBooking>>(`/admin/bookings/${qs({ ...q, page_size: PAGE_SIZE })}`),
  booking: (id: string) => api.get<StaffBookingDetail>(`/admin/bookings/${id}/`),
  transition: (id: string, action: BookingAction, reason?: string) =>
    api.post<StaffBookingDetail>(`/admin/bookings/${id}/${action}/`, reason ? { reason } : {}, { retries: 0 }),

  customers: (q: { search?: string; page?: number }) =>
    api.get<Page<StaffCustomer>>(`/admin/customers/${qs({ ...q, page_size: PAGE_SIZE })}`),
  customer: (id: string) => api.get<StaffCustomer>(`/admin/customers/${id}/`),

  payments: (q: { status?: string; search?: string; page?: number }) =>
    api.get<Page<StaffTransaction>>(`/admin/payments/${qs({ ...q, page_size: PAGE_SIZE })}`),
};
