/**
 * The pre-launch pieces (2026-11-18): account settings, the customer's
 * payment history, ONA's contact details, and the staff list.
 */

import { api, type Page } from "@/lib/api/client";
import { setTokens } from "@/lib/api/tokens";
import type { User } from "@/lib/auth/store";

/* ── Account settings (/auth/me/, /auth/password/) ─────────────────────── */

type ProfileInput = Pick<User, "first_name" | "last_name" | "phone">;

export const accountApi = {
  update: (body: Partial<ProfileInput>) => api.patch<User>("/auth/me/", body),

  /** Ends every other session; this one carries on with the fresh tokens. */
  changePassword: async (current_password: string, new_password: string): Promise<string> => {
    const r = await api.post<{ detail: string; tokens: { access: string; refresh: string } }>(
      "/auth/password/",
      { current_password, new_password },
    );
    setTokens(r.tokens);
    return r.detail;
  },
};

/* ── My payments (/payments/mine/) ─────────────────────────────────────── */

export type PaymentStatus = "pending" | "succeeded" | "failed";

export interface MyPayment {
  id: string;
  created_at: string;
  booking: { id: string; reference: string; room: string; start_at: string };
  how: string;
  status: PaymentStatus;
  status_display: string;
  amount_pesewas: number;
  amount_display: string;
  fee_pesewas: number;
  fee_display: string;
  charged_display: string;
  refunded_pesewas: number;
  refunded_display: string;
  receipt_number: string | null;
}

export const MY_PAYMENTS_PAGE = 20;

export const myPaymentsApi = {
  list: (page: number) =>
    api.get<Page<MyPayment>>(`/payments/mine/?page=${page}&page_size=${MY_PAYMENTS_PAGE}`),

  downloadReceipt: async (p: Pick<MyPayment, "id" | "receipt_number">): Promise<void> => {
    const blob = await api.get<Blob>(`/payments/mine/${p.id}/receipt/`, { responseType: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ONA-receipt-${p.receipt_number ?? p.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  },
};

/* ── Contact details (/content/contact/, /admin/contact/) ──────────────── */

export interface Contact {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  directions_url: string;
}

export const contactApi = {
  get: () => api.get<Contact>("/content/contact/"),
  adminGet: () => api.get<Contact & { updated_at: string }>("/admin/contact/"),
  adminUpdate: (body: Partial<Contact>) => api.patch<Contact & { updated_at: string }>("/admin/contact/", body),
};

/** Digits only, with Ghana's leading 0 swapped for 233 — what wa.me and tel: want. */
export function dialable(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `233${digits.slice(1)}` : digits;
}

/* ── Staff accounts (/admin/staff/) ────────────────────────────────────── */

export interface StaffMember {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  is_you: boolean;
  invite_pending: boolean;
  last_login: string | null;
  date_joined: string;
}

export const staffApi = {
  list: () => api.get<StaffMember[]>("/admin/staff/"),
  invite: (body: { email: string; first_name: string; last_name?: string }) =>
    api.post<StaffMember>("/admin/staff/", body),
  update: (id: string, body: Partial<Pick<StaffMember, "first_name" | "last_name" | "is_active">>) =>
    api.patch<StaffMember>(`/admin/staff/${id}/`, body),
  resendInvite: (id: string) => api.post<{ detail: string }>(`/admin/staff/${id}/resend-invite/`),
};
