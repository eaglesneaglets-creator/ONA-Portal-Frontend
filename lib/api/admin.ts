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
  /** Staff view: the real name as well as the stage name. */
  assigned_professional: { id: string; name: string; stage_name: string } | null;
  created_by_email: string | null;
  room_total_display: string;
  /** Still owed after payments and refunds (server-computed). */
  outstanding_pesewas: number;
  outstanding_display: string;
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
  /** A person recorded it (manual payment or refund); a provider never sets this. */
  recorded_by_staff: boolean;
}

export interface StaffTransaction {
  id: string;
  booking: { id: string; reference: string };
  customer: { id: string; name: string; email: string };
  provider: "hubtel" | "manual";
  provider_display: string;
  provider_ref: string | null;
  is_manual: boolean;
  method: PaymentMethod | "";
  method_display: string;
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

export type PaymentMethod = "cash" | "mobile_money" | "bank_transfer" | "card_terminal" | "other";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card_terminal", label: "Card machine" },
  { value: "other", label: "Other" },
];

/* Catalogue and content (Task 16) */

export interface AdminRoom {
  id: string;
  name: string;
  description: string;
  hourly_rate_pesewas: number;
  hourly_rate_display: string;
  capacity: number;
  is_active: boolean;
  sort_order: number;
}

export interface AdminService {
  id: string;
  name: string;
  description: string;
  base_price_pesewas: number;
  base_price_display: string;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
}

export interface AdminEngineer {
  id: string;
  name: string;
  bio: string;
  specialties: string[];
  is_active: boolean;
  sort_order: number;
}

export interface AdminPackage {
  id: string;
  name: string;
  description: string;
  hours: number;
  price_pesewas: number;
  price_display: string;
  room: string | null;
  includes: string[];
  is_active: boolean;
  sort_order: number;
}

export type CatalogueKind = "rooms" | "services" | "engineers" | "packages";

export interface AdminFaq {
  id: string;
  question: string;
  answer: string;
  is_published: boolean;
  sort_order: number;
  updated_at: string;
}

export type RateType = "hourly" | "daily" | "per_song" | "per_project" | "per_event" | "negotiable";

export const RATE_TYPES: { value: RateType; label: string }[] = [
  { value: "hourly", label: "Per hour" },
  { value: "daily", label: "Per day" },
  { value: "per_song", label: "Per song" },
  { value: "per_project", label: "Per project" },
  { value: "per_event", label: "Per event" },
  { value: "negotiable", label: "Negotiable" },
];

export interface Professional {
  id: string;
  name: string;
  stage_name: string;
  skills: string[];
  rate_type: RateType;
  rate_pesewas: number | null;
  rate_display: string;
  phone: string;
  email: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfessionalInput = Pick<
  Professional,
  "name" | "stage_name" | "skills" | "rate_type" | "rate_pesewas" | "phone" | "email" | "notes" | "is_active"
>;

export type JobStatus = "requested" | "arranged" | "in_progress" | "completed" | "cancelled";

export const JOB_STATUSES: { value: JobStatus; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "arranged", label: "Arranged" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export interface Job {
  id: string;
  reference: string;
  customer: string;
  customer_brief: { id: string; name: string; email: string; phone: string };
  professional: string | null;
  professional_brief: { id: string; name: string; stage_name: string } | null;
  title: string;
  brief: string;
  status: JobStatus;
  status_display: string;
  due_on: string | null;
  fee_pesewas: number | null;
  fee_display: string;
  notes: string;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export type JobInput = Partial<
  Pick<Job, "customer" | "professional" | "title" | "brief" | "status" | "due_on" | "fee_pesewas" | "notes">
>;

export interface NewCustomer {
  email: string;
  first_name: string;
  last_name?: string;
  phone?: string;
}

export interface StaffBookingInput {
  customer?: string;
  new_customer?: NewCustomer;
  room: string;
  engineer: string;
  service: string;
  /** ISO datetime, on the hour, studio time. */
  start_at: string;
  hours: number;
  notes?: string;
  status: "pending" | "confirmed";
  professional?: string | null;
  professional_fee_pesewas?: number;
  allow_outside_hours?: boolean;
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

  // Task 15 — manual brokering.
  createBooking: (input: StaffBookingInput) =>
    api.post<StaffBookingDetail>("/admin/bookings/", input, { retries: 0 }),
  assign: (id: string, professional: string | null, professional_fee_pesewas: number) =>
    api.post<StaffBookingDetail>(
      `/admin/bookings/${id}/assign/`,
      { professional, professional_fee_pesewas },
      { retries: 0 },
    ),

  professionals: (q: { search?: string; is_active?: boolean; page?: number; page_size?: number }) =>
    api.get<Page<Professional>>(`/admin/professionals/${qs({ page_size: PAGE_SIZE, ...q, is_active: q.is_active === undefined ? undefined : String(q.is_active) })}`),
  createProfessional: (input: ProfessionalInput) =>
    api.post<Professional>("/admin/professionals/", input, { retries: 0 }),
  updateProfessional: (id: string, input: Partial<ProfessionalInput>) =>
    api.patch<Professional>(`/admin/professionals/${id}/`, input, { retries: 0 }),

  // Task 16 — manual money.
  recordPayment: (
    bookingId: string,
    input: { amount_pesewas: number; method: PaymentMethod; reference?: string; note?: string },
  ) => api.post<StaffBookingDetail>(`/admin/bookings/${bookingId}/payments/`, input, { retries: 0 }),
  recordRefund: (txnId: string, amount_pesewas: number, note: string) =>
    api.post<StaffTransaction>(`/admin/payments/${txnId}/refund/`, { amount_pesewas, note }, { retries: 0 }),

  // Task 16 — catalogue and content.
  catalogue: <T>(kind: CatalogueKind) => api.get<Page<T>>(`/admin/${kind}/?page_size=100`),
  createCatalogue: <T>(kind: CatalogueKind, input: Partial<T>) =>
    api.post<T>(`/admin/${kind}/`, input, { retries: 0 }),
  updateCatalogue: <T>(kind: CatalogueKind, id: string, input: Partial<T>) =>
    api.patch<T>(`/admin/${kind}/${id}/`, input, { retries: 0 }),
  removeCatalogue: (kind: CatalogueKind, id: string) => api.delete<void>(`/admin/${kind}/${id}/`, { retries: 0 }),

  faqs: () => api.get<Page<AdminFaq>>("/admin/faqs/?page_size=100&ordering=sort_order"),
  createFaq: (input: Partial<AdminFaq>) => api.post<AdminFaq>("/admin/faqs/", input, { retries: 0 }),
  updateFaq: (id: string, input: Partial<AdminFaq>) => api.patch<AdminFaq>(`/admin/faqs/${id}/`, input, { retries: 0 }),
  removeFaq: (id: string) => api.delete<void>(`/admin/faqs/${id}/`, { retries: 0 }),

  jobs: (q: { status?: string; open?: boolean; search?: string; page?: number }) =>
    api.get<Page<Job>>(`/admin/jobs/${qs({ ...q, open: q.open ? "1" : undefined, page_size: PAGE_SIZE })}`),
  createJob: (input: JobInput) => api.post<Job>("/admin/jobs/", input, { retries: 0 }),
  updateJob: (id: string, input: JobInput) => api.patch<Job>(`/admin/jobs/${id}/`, input, { retries: 0 }),
};
