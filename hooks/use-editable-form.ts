import { useState } from "react";

import { useFocusFirstError } from "@/hooks/use-focus-first-error";
import type { FieldErrors } from "@/lib/api/errors";
import { omit } from "@/lib/utils";

/**
 * A form of text fields whose errors come from the API (FieldErrors), with
 * the house rule that a field's error belongs to what was typed: editing the
 * field clears it. Includes focus-after-failure (useFocusFirstError).
 */
export function useEditableForm<T extends object>(initial: T) {
  const [form, setForm] = useState<T>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const { formRef, focusFirstError } = useFocusFirstError();

  function edit<K extends keyof T & string>(field: K, value: T[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((prev) => omit(prev, field));
  }

  return { form, setForm, errors, setErrors, busy, setBusy, edit, formRef, focusFirstError };
}
