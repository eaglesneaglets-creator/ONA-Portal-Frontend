"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useEditableForm } from "@/hooks/use-editable-form";
import { TextField } from "@/components/dashboard/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type Contact, contactApi } from "@/lib/api/account";
import { showSaveError } from "@/lib/forms";

const EMPTY: Contact = {
  phone: "", whatsapp: "", email: "", address: "", directions_url: "",
  instagram_url: "", facebook_url: "", linkedin_url: "", tiktok_url: "", youtube_url: "",
};

const SOCIAL: { key: keyof Contact; label: string; placeholder: string }[] = [
  { key: "instagram_url", label: "Instagram", placeholder: "https://www.instagram.com/…" },
  { key: "facebook_url", label: "Facebook", placeholder: "https://www.facebook.com/…" },
  { key: "tiktok_url", label: "TikTok", placeholder: "https://www.tiktok.com/@…" },
  { key: "youtube_url", label: "YouTube", placeholder: "https://www.youtube.com/@…" },
  { key: "linkedin_url", label: "LinkedIn", placeholder: "https://www.linkedin.com/company/…" },
];

/** Just the editable fields (the API also sends updated_at). */
const fields = (c: Contact): Contact =>
  Object.fromEntries((Object.keys(EMPTY) as (keyof Contact)[]).map((k) => [k, c[k] ?? ""])) as unknown as Contact;

/**
 * ONA's contact details, as the public /contact page and the privacy policy
 * show them. Blank fields are left off the page. Saved changes are audited
 * and appear on the site within about a minute.
 */
export function ContactEditor() {
  const [saved, setSaved] = useState<Contact | null | undefined>(undefined);
  const { form, setForm, errors, setErrors, busy, setBusy, edit, formRef, focusFirstError } = useEditableForm<Contact>(EMPTY);

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
  }, [setForm]);

  const dirty = saved ? (Object.keys(EMPTY) as (keyof Contact)[]).some((k) => form[k] !== saved[k]) : false;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const c = fields(await contactApi.adminUpdate(form));
      setSaved(c);
      setForm(c);
      toast.success("Contact details saved. The site shows them within a minute.");
    } catch (err) {
      showSaveError(err, setErrors, focusFirstError, "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const err = (k: keyof Contact) => errors[k]?.[0];

  return (
    <Card>
      <form ref={formRef} onSubmit={save} noValidate>
        <CardHeader>
          <CardTitle className="text-[18px] font-black">Contact details</CardTitle>
          <CardDescription>
            Shown on the Contact page and used by the privacy policy; the social profiles appear in the
            site&apos;s footer. Leave a field blank to hide it.
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
              <TextField id="c-address" label="Studio address" placeholder="Street, Community 8, Tema"
                value={form.address} onChange={(v) => edit("address", v)} error={err("address")} />
              <TextField id="c-directions" label="Google Maps link (optional)" type="url" inputMode="url"
                placeholder="https://maps.app.goo.gl/…" value={form.directions_url}
                onChange={(v) => edit("directions_url", v)} error={err("directions_url")} />
              <fieldset className="grid gap-4 border-t border-border-soft pt-4">
                <legend className="mb-1 text-[15px] font-black text-ink">Social profiles</legend>
                <p className="-mt-2 text-[13.5px] text-ink-dim">
                  ONA&apos;s own pages. They appear under &ldquo;Follow ONA&rdquo; in the footer and tell Google these
                  profiles are the same business. Paste the full link from the profile page.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {SOCIAL.map((s) => (
                    <TextField key={s.key} id={`c-${s.key}`} label={s.label} type="url" inputMode="url"
                      placeholder={s.placeholder} value={form[s.key]}
                      onChange={(v) => edit(s.key, v)} error={err(s.key)} />
                  ))}
                </div>
              </fieldset>
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
