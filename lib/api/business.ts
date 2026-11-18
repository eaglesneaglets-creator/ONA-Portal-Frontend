/**
 * ONA's business rules (deposit, hold, notice, hours, fees, tax) as staff set
 * them in Business settings. Public pages read them so the copy never
 * contradicts what the server enforces; the server is always the authority.
 */

import { api } from "@/lib/api/client";
import { SERVER_API_URL } from "@/lib/api/studio";

export interface TaxLine {
  name: string;
  /** Hundredths of a percent: 1500 = 15%. */
  basis_points: number;
}

export interface PublicRules {
  booking_deposit_percent: number;
  unpaid_hold_minutes: number;
  free_cancellation_hours: number;
  deposit_credit_days: number;
  studio_open_hour: number;
  studio_close_hour: number;
  pass_paystack_fee: boolean;
  paystack_fee_basis_points: number;
  tax_enabled: boolean;
  taxes: TaxLine[];
}

export interface BusinessSettings extends PublicRules {
  max_open_unpaid: number;
  reminder_hours_before: number;
  studio_commission_percent: number;
  marketplace_commission_percent: number;
  invoice_business_name: string;
  invoice_address: string;
  invoice_tin: string;
  invoice_contact: string;
  invoice_bank_details: string;
  saved: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

/** What the site says if the rules cannot be fetched: the values in force before staff changed anything. */
export const DEFAULT_RULES: PublicRules = {
  booking_deposit_percent: 50,
  unpaid_hold_minutes: 60,
  free_cancellation_hours: 48,
  deposit_credit_days: 30,
  studio_open_hour: 0,
  studio_close_hour: 24,
  pass_paystack_fee: true,
  paystack_fee_basis_points: 195,
  tax_enabled: false,
  taxes: [],
};

/** On the server (public pages, ISR). Falls back to the defaults if the API is unreachable. */
export async function fetchRules(): Promise<PublicRules> {
  try {
    const res = await fetch(`${SERVER_API_URL}/content/rules/`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_RULES;
    return { ...DEFAULT_RULES, ...((await res.json()) as Partial<PublicRules>) };
  } catch {
    return DEFAULT_RULES;
  }
}

export const businessApi = {
  get: () => api.get<BusinessSettings>("/admin/business/"),
  update: (body: Partial<BusinessSettings>) => api.patch<BusinessSettings>("/admin/business/", body),
};

/* ── Wording ───────────────────────────────────────────────────────────── */

/** 60 → "one hour", 90 → "1 hour 30 minutes", 120 → "2 hours", 30 → "30 minutes". */
export function holdText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h === 1 ? "one hour" : h ? `${h} hours` : "";
  const mins = m ? `${m} minutes` : "";
  if (h === 1 && m) return `1 hour ${mins}`;
  return [hours, mins].filter(Boolean).join(" ");
}

/** 1500 → "15%", 250 → "2.5%". */
export function percentText(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100);
  const rest = basisPoints % 100;
  return rest ? `${whole}.${String(rest).padStart(2, "0").replace(/0$/, "")}%` : `${whole}%`;
}
