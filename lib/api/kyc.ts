/**
 * Identity checks — /api/v1/kyc/ (the person) and /api/v1/admin/kyc/ (staff).
 *
 * ONA's backend relays the shared KYC service (repo: kyc-service); the
 * browser never talks to it and never holds its key. The person sees only
 * the last four characters of their ID number after saving it; staff see
 * the whole number, and scans arrive as bytes shown from blob: URLs.
 */

import { api } from "@/lib/api/client";

export type KycStatus = "draft" | "submitted" | "in_review" | "changes_requested" | "approved" | "rejected";
export type IdType = "ghana_card" | "passport";
export type DocumentKind = "id_front" | "id_back" | "selfie";

export interface KycDocument {
  kind: DocumentKind;
  content_type?: string;
  size?: number;
  uploaded_at?: string;
  purged?: boolean;
}

export interface Verification {
  id: string;
  subject_ref: string;
  level: string;
  status: KycStatus;
  full_name: string;
  date_of_birth: string | null;
  id_type: IdType | "";
  id_number_last4: string;
  documents: KycDocument[];
  /** Field names, and "document:<kind>" for photos still needed. */
  missing: string[];
  /** Why it was rejected, or what to change. Written for the person. */
  decision_reason: string;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MyIdentity {
  /** False until ONA is connected to the KYC service. */
  available: boolean;
  verification: Verification | null;
}

export interface DetailsInput {
  full_name?: string;
  date_of_birth?: string;
  id_type?: IdType;
  id_number?: string;
}

export const kycApi = {
  mine: () => api.get<MyIdentity>("/kyc/"),
  start: () => api.post<MyIdentity>("/kyc/"),
  details: (body: DetailsInput) => api.patch<MyIdentity>("/kyc/details/", body),
  upload: (kind: DocumentKind, file: Blob, name: string) => {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file, name);
    return api.post<MyIdentity>("/kyc/documents/", form);
  },
  submit: () => api.post<MyIdentity>("/kyc/submit/"),
};

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export type ReviewFilter = "waiting" | "changes_requested" | "approved" | "rejected";

export interface OnaPerson {
  id: string;
  public_ref: number | null;
  name: string;
  email: string;
  role: string;
  phone?: string;
  date_joined?: string;
}

export interface ReviewRow {
  id: string;
  subject_ref: string;
  level: string;
  status: KycStatus;
  full_name: string;
  flags: string[];
  submitted_at: string | null;
  decided_at: string | null;
  person: OnaPerson | null;
}

export interface ReviewEvent {
  at: string;
  actor: string;
  action: string;
  from_status: string;
  to_status: string;
  note: string;
}

export interface ReviewDetail extends Verification {
  id_number: string;
  flags: string[];
  decided_by: string;
  events: ReviewEvent[];
  documents: (KycDocument & { sha256?: string })[];
  person: OnaPerson | null;
}

export type Decision = "approved" | "rejected" | "changes_requested";

export const kycAdminApi = {
  queue: (filter: ReviewFilter, page: number) =>
    api.get<{ count: number; page_size: number; results: ReviewRow[] }>(`/admin/kyc/?filter=${filter}&page=${page}`),
  detail: (id: string) => api.get<ReviewDetail>(`/admin/kyc/${id}/`),
  document: (id: string, kind: DocumentKind) =>
    api.get<Blob>(`/admin/kyc/${id}/documents/${kind}/`, { responseType: "blob" }),
  startReview: (id: string) => api.post<ReviewRow>(`/admin/kyc/${id}/start-review/`),
  decide: (id: string, decision: Decision, reason: string) =>
    api.post<ReviewRow>(`/admin/kyc/${id}/decision/`, { decision, reason }),
};

/* ------------------------------------------------------------------ */
/* Words                                                               */
/* ------------------------------------------------------------------ */

export const STATUS_LABEL: Record<KycStatus, string> = {
  draft: "Not sent yet",
  submitted: "Waiting for review",
  in_review: "Being reviewed",
  changes_requested: "Changes requested",
  approved: "Verified",
  rejected: "Not verified",
};

export const DOC_LABEL: Record<DocumentKind, string> = {
  id_front: "Front of your ID",
  id_back: "Back of your ID",
  selfie: "A photo of you",
};

/** Which photos this ID type needs: a passport has one photo page. */
export function docsFor(idType: IdType | ""): DocumentKind[] {
  return idType === "passport" ? ["id_front", "selfie"] : ["id_front", "id_back", "selfie"];
}

export const FLAG_LABEL: Record<string, string> = {
  duplicate_id: "This ID number is already verified on another platform's account.",
};
