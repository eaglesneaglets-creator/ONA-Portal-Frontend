"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { TextField } from "@/components/dashboard/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountApi } from "@/lib/api/account";
import { ApiError, type FieldErrors } from "@/lib/api/errors";
import { omit } from "@/lib/utils";
import { type User, useAuthStore } from "@/lib/auth/store";

/**
 * Account settings, shadcn's settings pattern: one card per concern, each
 * with its own save in the footer, so changing a phone number never asks
 * for a password. Shared by the customer portal and the staff console.
 */
export function AccountSettings() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return (
    <div className="grid gap-6">
      <ProfileCard user={user} />
      <PasswordCard />
    </div>
  );
}

function firstError(errors: FieldErrors, field: string): string | undefined {
  return errors[field]?.[0];
}

function ProfileCard({ user }: { user: User }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ first_name: user.first_name, last_name: user.last_name, phone: user.phone });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const dirty =
    form.first_name !== user.first_name || form.last_name !== user.last_name || form.phone !== user.phone;

  function edit(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((prev) => omit(prev, field));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim()) {
      setErrors({ first_name: ["Enter your first name."] });
      return;
    }
    setBusy(true);
    try {
      const updated = await accountApi.update(form);
      setUser(updated);
      setForm({ first_name: updated.first_name, last_name: updated.last_name, phone: updated.phone });
      toast.success("Your details are saved.");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else toast.error(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={save} noValidate>
        <CardHeader>
          <CardTitle className="text-[18px] font-black">Your details</CardTitle>
          <CardDescription>The name and number ONA uses for your bookings and receipts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="first_name" label="First name" autoComplete="given-name" value={form.first_name}
              onChange={(v) => edit("first_name", v)} error={firstError(errors, "first_name")} />
            <TextField id="last_name" label="Last name" autoComplete="family-name" value={form.last_name}
              onChange={(v) => edit("last_name", v)} error={firstError(errors, "last_name")} />
          </div>
          <TextField id="phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="024 123 4567" value={form.phone}
            onChange={(v) => edit("phone", v)} error={firstError(errors, "phone")} />
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} readOnly disabled className="h-11 md:h-9" aria-describedby="email-hint" />
            <p id="email-hint" className="text-[13px] text-ink-mute">
              You sign in with this address. To change it, <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">contact ONA</Link>.
            </p>
          </div>
        </CardContent>
        <CardFooter className="mt-2 justify-end gap-3 border-t border-border-soft pt-4">
          {dirty ? (
            <Button type="button" variant="ghost" className="h-11 md:h-9" disabled={busy}
              onClick={() => { setForm({ first_name: user.first_name, last_name: user.last_name, phone: user.phone }); setErrors({}); }}>
              Undo
            </Button>
          ) : null}
          <Button type="submit" className="h-11 md:h-9" disabled={busy || !dirty}>
            {busy ? "Saving…" : "Save details"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const local: FieldErrors = {};
    if (!current) local.current_password = ["Enter your current password."];
    if (next.length < 8) local.new_password = ["Use at least 8 characters."];
    else if (next !== confirm) local.confirm = ["The two new passwords do not match."];
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setBusy(true);
    try {
      const detail = await accountApi.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setErrors({});
      toast.success(detail);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else toast.error(err instanceof Error ? err.message : "Could not change your password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const type = show ? "text" : "password";
  return (
    <Card>
      <form onSubmit={save} noValidate>
        <CardHeader>
          <CardTitle className="text-[18px] font-black">Password</CardTitle>
          <CardDescription>Changing it signs you out on every other phone or computer.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-2">
          <TextField id="current_password" label="Current password" type={type} autoComplete="current-password"
            value={current} onChange={(v) => { setCurrent(v); setErrors({}); }}
            error={firstError(errors, "current_password")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="new_password" label="New password" type={type} autoComplete="new-password"
              value={next} onChange={(v) => { setNext(v); setErrors({}); }}
              error={firstError(errors, "new_password")} />
            <TextField id="confirm_password" label="New password again" type={type} autoComplete="new-password"
              value={confirm} onChange={(v) => { setConfirm(v); setErrors({}); }}
              error={firstError(errors, "confirm")} />
          </div>
        </CardContent>
        <CardFooter className="mt-2 justify-between gap-3 border-t border-border-soft pt-4">
          <Button type="button" variant="ghost" className="h-11 px-2 md:h-9" onClick={() => setShow((s) => !s)}
            aria-pressed={show}>
            {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            {show ? "Hide passwords" : "Show passwords"}
          </Button>
          <Button type="submit" className="h-11 md:h-9" disabled={busy || !current || !next}>
            {busy ? "Changing…" : "Change password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
