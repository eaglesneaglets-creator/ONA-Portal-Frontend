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

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  trailing,
}: FieldProps & { trailing?: React.ReactNode }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const invalid = Boolean(errors?.length);

  return (
    <div className={compact ? "mb-3" : "mb-4"}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-[13.5px] font-bold text-ink">
          {label}
        </Label>
        {labelAction}
      </div>

      {/* The wrapper is what a trailing control (the password Show button)
          positions against — the input itself, not the label row above it. */}
      <div className="relative">
        <Input
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
          className={cn("h-11 bg-surface text-[15px]", trailing ? "pr-16" : "")}
        />
        {trailing}
      </div>

      {hint && !invalid && (
        <p id={hintId} className="mt-1.5 text-[12px] leading-snug text-ink-mute">
          {hint}
        </p>
      )}

      {invalid && (
        <p id={errorId} className="mt-1.5 text-[12.5px] leading-snug text-err">
          {errors!.join(" ")}
        </p>
      )}
    </div>
  );
}

/** A password field with a show/hide toggle inside the input. */
export function PasswordField(props: Omit<FieldProps, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // 36px visually, so it sits inside the 44px input; the ::after of
          // ona-tap-44 extends the touch target to 44px on phones.
          className="ona-tap-44 absolute top-1/2 right-1 h-9 -translate-y-1/2 rounded-md px-3 text-[12.5px] font-bold text-ink-dim hover:bg-surface-sunk hover:text-ink"
        >
          {visible ? "Hide" : "Show"}
        </button>
      }
    />
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
    <Alert variant="destructive" className="mb-4 border-err/25 bg-err-bg text-err">
      <CircleAlert aria-hidden="true" />
      <AlertDescription className="text-[14px] leading-snug text-err">{message}</AlertDescription>
    </Alert>
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
    <Button
      type="submit"
      disabled={pending}
      // aria-busy rather than only a visual change: a disabled button with
      // no announcement leaves a screen-reader user unsure anything
      // happened.
      aria-busy={pending}
      className="mt-1 h-11 w-full text-[15px] font-bold"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="animate-spin" />
          One moment…
        </>
      ) : (
        children
      )}
    </Button>
  );
}
