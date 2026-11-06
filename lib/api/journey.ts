/**
 * The customer journey (backend: apps/accounts/journey.py) — the "Get
 * started" guide. Every step is worked out on the server from the customer's
 * real records; the page only shows it and offers the next action.
 */

import { api } from "@/lib/api/client";

export type JourneyStepKey = "account" | "verify_email" | "phone" | "first_booking" | "deposit" | "first_session";
export type JourneyStage = "signed_up" | "booked" | "paid" | "came_in";

export interface JourneyStep {
  key: JourneyStepKey;
  title: string;
  body: string;
  done: boolean;
  /** Done in place, on the guide itself. */
  action?: "resend_verification" | "phone";
  /** Done elsewhere: where to go, and what the button says. */
  href?: string;
  cta?: string;
  /** Time matters: an unpaid booking's one-hour hold is running. */
  urgent?: boolean;
}

export interface Journey {
  steps: JourneyStep[];
  done: number;
  total: number;
  next: JourneyStepKey | null;
  complete: boolean;
  dismissed: boolean;
  stage: JourneyStage;
  is_new: boolean;
  /** "What brings you to ONA?" from the welcome flow ("" until answered). */
  intent: Intent | "";
  welcomed: boolean;
  tours_seen: Tour[];
}

export type Intent = "record" | "mix" | "produce" | "rehearse" | "video" | "content" | "browse";
export type Tour = "booking" | "console";

export const updateJourney = (data: { hidden?: boolean; intent?: Intent; welcomed?: boolean; tour_seen?: Tour }) =>
  api.post<Journey>("/auth/journey/", data, { retries: 0 });

export const fetchJourney = () => api.get<Journey>("/auth/journey/");

export const setJourneyHidden = (hidden: boolean) => updateJourney({ hidden });

export const resendVerification = () => api.post("/auth/resend-verification/", {}, { retries: 0 });

export const savePhone = (phone: string) => api.patch("/auth/me/", { phone }, { retries: 0 });
