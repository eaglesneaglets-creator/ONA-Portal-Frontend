/**
 * Form primitives for the auth pages.
 *
 * These exist to make one thing impossible to get wrong: an error that the
 * backend sent but the user never sees. Task 12 found that exact bug —
 * `non_field_errors` was being treated as a field name, so a wrong password
 * rendered against an input that does not exist and vanished.
 *
 * So the split is explicit here too. FormError takes the form-level message;
 * Field takes the per-field one. Neither guesses.
 */

"use client";

import { useId, useState } from "react";

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  /** Messages for THIS field, from ApiError.fieldErrors. */
  errors?: string[];
  hint?: string;
  /**
   * Sits on the label's row, right-aligned — "Forgot password?" beside
   * PASSWORD. Kept in normal flow rather than absolutely positioned, or it
   * lands on top of the label at narrow widths.
   */
  labelAction?: React.ReactNode;
  /**
   * Tighter vertical rhythm, for the register form.
   *
   * Register has six fields plus a role picker. At the login form's spacing
   * it overflows a 768px-tall laptop viewport, and an auth form that has to
   * be scrolled to reach its own submit button is a real drop-off point.
   */
  compact?: boolean;
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  defaultValue,
  required,
  errors,
  hint,
  labelAction,
  compact,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const invalid = Boolean(errors?.length);

  return (
    <div className={compact ? "mb-2.5" : "mb-4"}>
      <div className="mb-[7px] flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-mute"
        >
          {label}
        </label>
        {labelAction}
      </div>

      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        // aria-invalid and aria-describedby are what connect the message to
        // the input for a screen reader. Without them the error is visible
        // but unannounced, which is the same as absent.
        aria-invalid={invalid || undefined}
        aria-describedby={
          [invalid ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined
        }
        className={`min-h-[var(--tap-min)] w-full rounded-md border px-[13px] py-[11px] text-[13.5px] outline-none transition-colors focus:border-ona-red focus:ring-[3px] focus:ring-ona-red/15 ${
          invalid ? "border-err" : "border-border-default"
        }`}
      />

      {hint && !invalid && (
        <p id={hintId} className="mt-1.5 text-[10.5px] leading-snug text-ink-mute">
          {hint}
        </p>
      )}

      {invalid && (
        <p id={errorId} className="mt-1.5 text-[10.5px] leading-snug text-err">
          {errors!.join(" ")}
        </p>
      )}
    </div>
  );
}

/** A password field with a show/hide toggle. */
export function PasswordField(props: Omit<FieldProps, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Field {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Offset from the top of the wrapper by the label's height, so it
        // lands on the input itself. A fixed offset would drift the moment
        // the label row changed height — which is exactly what compact
        // spacing does.
        // 38px visually so it sits inside the input, but the ::after
        // extends the hit area to 44px on touch devices — the same trick
        // used for the compact row buttons in the admin tables. Making the
        // button itself 44px would push it past the input's edge.
        className="ona-tap-44 absolute right-[5px] top-[26px] min-h-[38px] rounded-sm px-[11px] text-[10.5px] font-bold text-ink-dim hover:text-ink"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/**
 * The form-level error.
 *
 * `role="alert"` so it is announced when it appears — someone using a
 * screen reader should not have to go hunting for why the form did not
 * submit.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-md bg-err-bg px-4 py-3.5 text-[13.5px] leading-snug text-err"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        className="mt-px h-[18px] w-[18px] flex-none"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      // aria-busy rather than only a visual change: a disabled button with
      // no announcement leaves a screen-reader user unsure anything
      // happened.
      aria-busy={pending}
      className="mt-1 min-h-[var(--tap-min)] w-full rounded-md bg-ona-red px-6 font-bold text-white transition-colors hover:bg-ona-tertiary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "One moment…" : children}
    </button>
  );
}
