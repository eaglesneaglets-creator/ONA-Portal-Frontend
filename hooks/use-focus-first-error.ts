import { useCallback, useEffect, useRef } from "react";

const FOCUSABLE =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * After a submit fails, move focus to what went wrong.
 *
 * The forms already mark bad fields `aria-invalid` and show form-level
 * failures in a `role="alert"`, so a screen reader hears the problem; but
 * focus stayed on the submit button, leaving keyboard and screen-reader users
 * to hunt for the field. Modern Web Guidance (forms): "move focus to the
 * first invalid field (or an error summary) when a form submission fails".
 *
 * Usage:
 *   const { formRef, focusFirstError } = useFocusFirstError();
 *   <form ref={formRef} …>
 *   …in each failure path, after setting the errors: focusFirstError();
 *
 * A component that renders several forms passes the one that failed instead:
 *   focusFirstError(event.currentTarget)
 *
 * It is called explicitly rather than run whenever errors change: several
 * forms clear a field's error as you type, and focus must never jump then.
 * The focus happens after React has rendered the errors, so it finds them.
 */
export function useFocusFirstError() {
  const formRef = useRef<HTMLFormElement>(null);
  // null: nothing asked; true: the form on formRef; or the form to search.
  const requested = useRef<HTMLFormElement | true | null>(null);

  // No dependency list on purpose: run after every commit, act only when asked.
  useEffect(() => {
    const asked = requested.current;
    if (!asked) return;
    requested.current = null;
    const form = asked === true ? formRef.current : asked;
    if (!form) return;

    const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalid) {
      // A radio group or similar marks its wrapper; focus the control inside.
      const target = invalid.matches(FOCUSABLE) ? invalid : invalid.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? invalid).focus();
      return;
    }

    const alert = form.querySelector<HTMLElement>('[role="alert"]');
    if (alert) {
      if (!alert.hasAttribute("tabindex")) alert.setAttribute("tabindex", "-1");
      alert.focus();
    }
  });

  const focusFirstError = useCallback((form?: HTMLFormElement | null) => {
    requested.current = form ?? true;
  }, []);

  return { formRef, focusFirstError };
}
