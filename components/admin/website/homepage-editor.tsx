"use client";

import { ImageIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MediaPicker } from "@/components/admin/website/media-picker";
import { MediaThumb } from "@/components/admin/website/media-thumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { adminApi, type AdminSite, type MediaRef } from "@/lib/api/admin";
import { apiMessage } from "@/components/admin/website/api-message";
import { ApiError } from "@/lib/api/errors";

/** What the homepage shows for any field left blank (app/page.tsx HERO_DEFAULT). */
const DEFAULTS = {
  hero_eyebrow: "Recording studio · Tema",
  hero_title: "Record.\nKeep your money safe.",
  hero_body: "Pick a room and an engineer, see the price before you commit, and pay ONA — who holds it until your session.",
};

type HeroForm = { hero_eyebrow: string; hero_title: string; hero_body: string; hero_focus: number; image: MediaRef | null };
type GoogleForm = { google_rating: string; google_review_count: string; google_reviews_url: string };

const heroOf = (s: AdminSite): HeroForm => ({
  hero_eyebrow: s.hero_eyebrow, hero_title: s.hero_title, hero_body: s.hero_body,
  hero_focus: s.hero_focus, image: s.hero_image_detail,
});
const googleOf = (s: AdminSite): GoogleForm => ({
  google_rating: s.google_rating ?? "", google_review_count: s.google_review_count?.toString() ?? "",
  google_reviews_url: s.google_reviews_url,
});

/** The homepage hero and the Google rating summary shown beside the reviews. */
export function HomepageEditor() {
  const [site, setSite] = useState<AdminSite | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    adminApi.site().then((s) => live && setSite(s)).catch(() => live && setSite(null));
    return () => {
      live = false;
    };
  }, []);

  if (site === undefined) return <div className="grid gap-4"><Skeleton className="h-64" /><Skeleton className="h-40" /></div>;
  if (site === null) return <p className="text-[14px] text-err">The homepage settings could not be loaded. Reload the page to try again.</p>;
  return (
    <div className="grid gap-6">
      <HeroCard site={site} onSaved={setSite} />
      <GoogleCard site={site} onSaved={setSite} />
    </div>
  );
}

/** The API's per-field messages, first message per field. */
function fieldError(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  return Object.fromEntries(
    Object.entries(err.fieldErrors).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)]),
  );
}

function HeroCard({ site, onSaved }: { site: AdminSite; onSaved: (s: AdminSite) => void }) {
  const [form, setForm] = useState<HeroForm>(() => heroOf(site));
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saved = heroOf(site);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof HeroForm>(k: K, v: HeroForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const s = await adminApi.updateSite({
        hero_eyebrow: form.hero_eyebrow, hero_title: form.hero_title, hero_body: form.hero_body,
        hero_focus: form.hero_focus, hero_image: form.image?.id ?? null,
      });
      onSaved(s);
      setForm(heroOf(s));
      toast.success("Homepage saved. Visitors see it within a minute.");
    } catch (err) {
      setErrors(fieldError(err));
      toast.error(apiMessage(err, "Could not save. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={(e) => void save(e)} noValidate>
        <CardHeader>
          <CardTitle className="text-[18px] font-black">Homepage hero</CardTitle>
          <CardDescription>The photo and words at the top of the homepage. A blank field shows the built-in text in grey.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-2">
          <div className="grid gap-2">
            <Label>Photo</Label>
            <div className="flex flex-wrap items-center gap-4">
              {form.image ? (
                <MediaThumb src={form.image.src} alt={form.image.alt} className="aspect-[16/9] w-56" />
              ) : (
                <span className="grid aspect-[16/9] w-56 place-items-center rounded-lg border border-dashed border-border-default text-[13px] text-ink-mute">
                  Built-in stock photo
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => setPicking(true)}>
                  <ImageIcon aria-hidden="true" />
                  {form.image ? "Change photo" : "Choose photo"}
                </Button>
                {form.image ? (
                  <Button type="button" variant="ghost" className="h-11 md:h-9" onClick={() => set("image", null)}>
                    <X aria-hidden="true" />
                    Use the built-in photo
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-[12.5px] text-ink-mute">A wide, bright photo works best: the brand colours are laid over it and the words sit on its left.</p>
          </div>

          {form.image ? (
            <div className="grid gap-1.5">
              <Label id="hero-focus-label">Keep in view on phones: {form.hero_focus <= 33 ? "left" : form.hero_focus >= 67 ? "right" : "middle"} ({form.hero_focus}%)</Label>
              <Slider
                aria-labelledby="hero-focus-label"
                thumbLabel="Part of the photo kept in view on phones"
                min={0}
                max={100}
                step={5}
                value={[form.hero_focus]}
                onValueChange={([v]) => set("hero_focus", v)}
                className="max-w-sm py-3"
              />
              <p className="text-[12.5px] text-ink-mute">A phone screen shows a narrow slice of the photo. Slide towards the part that matters.</p>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="hero-eyebrow">Label above the headline</Label>
            <Input id="hero-eyebrow" value={form.hero_eyebrow} maxLength={60} placeholder={DEFAULTS.hero_eyebrow}
              onChange={(e) => set("hero_eyebrow", e.target.value)} className="h-11 md:h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hero-title">Headline (up to three lines)</Label>
            <Textarea id="hero-title" value={form.hero_title} maxLength={120} rows={3} placeholder={DEFAULTS.hero_title}
              aria-invalid={Boolean(errors.hero_title)} onChange={(e) => set("hero_title", e.target.value)} />
            {errors.hero_title ? <p className="text-[13px] text-err">{errors.hero_title}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hero-body">Sentence under the headline</Label>
            <Textarea id="hero-body" value={form.hero_body} maxLength={300} rows={3} placeholder={DEFAULTS.hero_body}
              onChange={(e) => set("hero_body", e.target.value)} />
          </div>
        </CardContent>
        <CardFooter className="mt-2 justify-end gap-3 border-t border-border-soft pt-4">
          {dirty ? (
            <Button type="button" variant="ghost" className="h-11 md:h-9" disabled={busy} onClick={() => { setForm(saved); setErrors({}); }}>
              Undo
            </Button>
          ) : null}
          <Button type="submit" className="h-11 md:h-9" disabled={busy || !dirty}>{busy ? "Saving…" : "Save homepage"}</Button>
        </CardFooter>
      </form>
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        title="Choose the hero photo"
        onPick={(m) => {
          set("image", { id: m.id, src: m.src, width: m.width, height: m.height, alt: m.alt_text });
          setPicking(false);
        }}
      />
    </Card>
  );
}

function GoogleCard({ site, onSaved }: { site: AdminSite; onSaved: (s: AdminSite) => void }) {
  const [form, setForm] = useState<GoogleForm>(() => googleOf(site));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saved = googleOf(site);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const s = await adminApi.updateSite({
        google_rating: form.google_rating.trim() || null,
        google_review_count: form.google_review_count.trim() ? Number(form.google_review_count) : null,
        google_reviews_url: form.google_reviews_url.trim(),
      });
      onSaved(s);
      setForm(googleOf(s));
      toast.success("Google rating saved.");
    } catch (err) {
      setErrors(fieldError(err));
      toast.error(apiMessage(err, "Could not save. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={(e) => void save(e)} noValidate>
        <CardHeader>
          <CardTitle className="text-[18px] font-black">Google rating</CardTitle>
          <CardDescription>
            Shown beside the reviews as a link to ONA on Google. Copy the numbers from ONA&apos;s Google listing now and then;
            leave both blank to hide it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-2 sm:grid-cols-[120px_160px_1fr]">
          <div className="grid gap-1.5">
            <Label htmlFor="g-rating">Rating</Label>
            <Input id="g-rating" inputMode="decimal" placeholder="4.6" value={form.google_rating}
              aria-invalid={Boolean(errors.google_rating)}
              onChange={(e) => setForm((f) => ({ ...f, google_rating: e.target.value }))} className="h-11 md:h-9" />
            {errors.google_rating ? <p className="text-[13px] text-err">{errors.google_rating}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="g-count">Number of reviews</Label>
            <Input id="g-count" inputMode="numeric" placeholder="151" value={form.google_review_count}
              onChange={(e) => setForm((f) => ({ ...f, google_review_count: e.target.value }))} className="h-11 md:h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="g-url">Link to ONA on Google Maps</Label>
            <Input id="g-url" type="url" inputMode="url" placeholder="https://maps.app.goo.gl/…" value={form.google_reviews_url}
              aria-invalid={Boolean(errors.google_reviews_url)}
              onChange={(e) => setForm((f) => ({ ...f, google_reviews_url: e.target.value }))} className="h-11 md:h-9" />
            {errors.google_reviews_url ? <p className="text-[13px] text-err">{errors.google_reviews_url}</p> : null}
          </div>
        </CardContent>
        <CardFooter className="mt-2 justify-end border-t border-border-soft pt-4">
          <Button type="submit" className="h-11 md:h-9" disabled={busy || !dirty}>{busy ? "Saving…" : "Save rating"}</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
