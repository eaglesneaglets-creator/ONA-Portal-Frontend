import { toast } from "sonner";

import { ApiError, type FieldErrors } from "@/lib/api/errors";
import { parseGhsToPesewas } from "@/lib/money";

/** One message per field, as the staff console's inline forms show them. */
export type FieldMessages = Record<string, string>;

const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";

/**
 * Why a save failed, split for an inline form: the API's field messages go
 * on the fields; with none, one form-level message says what happened.
 */
export function splitFailure(err: unknown, fallback = SOMETHING_WENT_WRONG): { form: string | null; fields: FieldMessages } {
  if (!(err instanceof ApiError)) return { form: fallback, fields: {} };
  const fields = err.firstFieldErrors;
  return { form: Object.keys(fields).length ? null : err.formError, fields };
}

/**
 * Why a save failed, for a form whose other failures are a toast: field
 * errors go on the fields and focus moves to the first; anything else is a
 * toast with the API's message (or `fallback`).
 */
export function showSaveError(
  err: unknown,
  setErrors: (errors: FieldErrors) => void,
  focusFirstError: () => void,
  fallback: string,
): void {
  if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
    setErrors(err.fieldErrors);
    focusFirstError();
  } else toast.error(err instanceof Error ? err.message : fallback);
}

/**
 * An optional fee typed in cedis: `null` when left blank, pesewas when it
 * reads as an amount, or the message to show when it does not.
 */
export function optionalFee(raw: string, example: string): { pesewas: number | null; error?: string } {
  if (!raw.trim()) return { pesewas: null };
  const pesewas = parseGhsToPesewas(raw);
  return pesewas === null ? { pesewas: null, error: `Enter the fee in cedis, e.g. ${example} or ${example}.50.` } : { pesewas };
}
