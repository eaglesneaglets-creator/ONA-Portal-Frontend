import { useState } from "react";

import { useFocusFirstError } from "@/hooks/use-focus-first-error";
import { type FieldMessages, splitFailure } from "@/lib/forms";

/**
 * The state every inline staff-console form keeps while it saves: busy, one
 * message per field, one form-level message, and focus on the problem after
 * a failure (useFocusFirstError).
 *
 *   const { busy, setBusy, errors, formError, setFormError, formRef, reject, fail } = useSaveState();
 *   if (reject(local)) return;           // local checks failed
 *   try { … } catch (err) { fail(err) }  // the API said no
 */
export function useSaveState() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldMessages>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { formRef, focusFirstError } = useFocusFirstError();

  /** Shows the local checks' messages; true when there were any, so the caller stops. */
  function reject(local: FieldMessages): boolean {
    setErrors(local);
    if (!Object.keys(local).length) return false;
    focusFirstError();
    return true;
  }

  /** Shows a failure already split into form and field messages, and re-enables the form. */
  function show(failure: { form: string | null; fields: FieldMessages }) {
    setErrors(failure.fields);
    setFormError(failure.form);
    setBusy(false);
    focusFirstError();
  }

  /** The save failed: show why (see splitFailure), re-enable the form, move focus there. */
  function fail(err: unknown, fallback?: string) {
    show(splitFailure(err, fallback));
  }

  return { busy, setBusy, errors, setErrors, formError, setFormError, formRef, reject, show, fail };
}

/** A form's values in one object, with a typed setter for one field: set("title", "Mix"). */
export function useFields<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((v) => ({ ...v, [key]: value }));
  return [values, set] as const;
}
