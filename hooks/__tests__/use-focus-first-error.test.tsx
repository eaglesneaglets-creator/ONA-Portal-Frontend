import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useFocusFirstError } from "@/hooks/use-focus-first-error";

/** A form shaped like ONA's: errors in state, cleared as you type. */
function Form({ fail }: { fail: "field" | "form" }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { formRef, focusFirstError } = useFocusFirstError();

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (fail === "field") setErrors({ email: "Enter an email address." });
        else setFormError("Wrong email or password.");
        focusFirstError();
      }}
    >
      {formError ? <div role="alert">{formError}</div> : null}
      <label htmlFor="name">Name</label>
      <input id="name" />
      <label htmlFor="email">Email</label>
      <input
        id="email"
        aria-invalid={Boolean(errors.email) || undefined}
        onChange={() => setErrors({})}
      />
      <button type="submit">Save</button>
    </form>
  );
}

describe("useFocusFirstError", () => {
  it("moves focus to the first invalid field after a failed submit", () => {
    render(<Form fail="field" />);
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();
    fireEvent.submit(save.closest("form")!);
    expect(document.activeElement).toBe(screen.getByLabelText("Email"));
  });

  it("falls back to the form's alert when no field is to blame", () => {
    render(<Form fail="form" />);
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);
    const alert = screen.getByRole("alert");
    expect(document.activeElement).toBe(alert);
    expect(alert.getAttribute("tabindex")).toBe("-1");
  });

  it("does not move focus when errors change because someone is typing", () => {
    render(<Form fail="field" />);
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);
    const name = screen.getByLabelText("Name");
    name.focus();
    // Typing in Email clears its error: a re-render, but nothing asked for focus.
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    expect(document.activeElement).toBe(name);
  });
});
