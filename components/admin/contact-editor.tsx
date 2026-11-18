"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { TextField } from "@/components/dashboard/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type Contact, contactApi } from "@/lib/api/account";
import { ApiError, type FieldErrors } from "@/lib/api/errors";
import { omit } from "@/lib/utils";

const EMPTY: Contact = { phone: "", whatsapp: "", email: "", address: "", directions_url: "" };

/** Just the editable fields (the API also sends updated_at). */
const fields = (c: Contact): Contact => ({
  phone: c.phone, whatsapp: c.whatsapp, email: c.email, address: c.address, directions_url: c.directions_url,
});

/**
 * ONA's contact details, as the public /contact page and the privacy policy
 * show them. Blank fields are left off the page. Saved changes are audited
 * and appear on the site within about a minute.
 */
export function ContactEditor() {
  const [saved, setSaved] = useState<Contact | null | undefined>(undefined);
  const [form, setForm] = useState<Contact>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    contactApi
      .adminGet()
      .then((r) => {
        if (!live) return;
        const c = fields(r);
        setSaved(c);
        setForm(c);
      })
      .catch(() => live && setSaved(null));
    return () => {
      live = false;
    };
  }, []);

  const dirty = saved ? (Object.keys(EMPTY) as (keyof Contact)[]).some((k) => form[k] !== saved[k]) : false;

  function edit(field: keyof Contact, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((prev) => omit(prev, field));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const c = fields(await contactApi.adminUpdate(form));
      setSaved(c);
      setForm(c);
      toast.success("Contact details saved. The site shows them within a minute.");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else toast.error(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const err = (k: keyof Contact) => errors[k]?.[0];

  return (
    <Card>
      <form onSubmit={save} noValidate>
        <CardHeader>
          <CardTitle className="text-[18px] font-black">Contact details</CardTitle>
          <CardDescription>
            Shown on the Contact page and used by the privacy policy. Leave a field blank to hide it.
          </CardDescription>
          <CardAction>
            <Button asChild variant="outline" className="h-11 md:h-9">
              <Link href="/contact" target="_blank">
                <ExternalLink aria-hidden="true" />
                View contact page
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4 pt-2">
          {saved === undefined ? (
            <div className="grid gap-3">
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
            </div>
          ) : saved === null ? (
            <p className="text-[14px] text-err">Contact details could not be loaded. Reload the page to try again.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="c-phone" label="Phone" type="tel" inputMode="tel" placeholder="030 000 0000"
                  value={form.phone} onChange={(v) => edit("phone", v)} error={err("phone")} />
                <TextField id="c-whatsapp" label="WhatsApp number" type="tel" inputMode="tel"
                  value={form.whatsapp} onChange={(v) => edit("whatsapp", v)} error={err("whatsapp")} />
              </div>
              <TextField id="c-email" label="Email" type="email" inputMode="email" placeholder="hello@…"
                value={form.email} onChange={(v) => edit("email", v)} error={err("email")} />
              <TextField id="c-address" label="Studio address" placeholder="Street, area, Accra"
                value={form.address} onChange={(v) => edit("address", v)} error={err("address")} />
              <TextField id="c-directions" label="Google Maps link (optional)" type="url" inputMode="url"
                placeholder="https://maps.app.goo.gl/…" value={form.directions_url}
                onChange={(v) => edit("directions_url", v)} error={err("directions_url")} />
            </>
          )}
        </CardContent>
        <CardFooter className="mt-2 justify-end gap-3 border-t border-border-soft pt-4">
          {dirty && saved ? (
            <Button type="button" variant="ghost" className="h-11 md:h-9" disabled={busy}
              onClick={() => { setForm(saved); setErrors({}); }}>
              Undo
            </Button>
          ) : null}
          <Button type="submit" className="h-11 md:h-9" disabled={busy || !dirty}>
            {busy ? "Saving…" : "Save contact details"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
