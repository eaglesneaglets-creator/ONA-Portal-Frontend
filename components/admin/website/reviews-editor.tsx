"use client";

import { Plus, Quote, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EditorFooter } from "@/components/dashboard/editor-footer";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminApi, type AdminTestimonial } from "@/lib/api/admin";
import { apiMessage } from "@/components/admin/website/api-message";
import { ApiError } from "@/lib/api/errors";

const SOURCES = [
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "direct", label: "Sent to ONA" },
] as const;

/** Radix Select items cannot have an empty value, so "no stars" has its own. */
const NO_RATING = "none";

/** The reviews quoted on the homepage, chosen from what people wrote on Google and elsewhere. */
export function ReviewsEditor() {
  const [items, setItems] = useState<AdminTestimonial[] | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<AdminTestimonial | "new" | null>(null);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    adminApi.testimonials().then((t) => live && setItems(t)).catch(() => live && setItems(null));
    return () => {
      live = false;
    };
  }, [reload]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[62ch] text-[14px] text-ink-dim">
          The homepage shows every published review in one scrolling row, in this order. Copy a review exactly as its author wrote it, and name them
          by first name and initial (&ldquo;Ama K.&rdquo;).
        </p>
        <Button className="h-11 md:h-9" onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" />
          Add review
        </Button>
      </div>

      {items === null ? (
        <ErrorState message="Reviews could not be loaded." onRetry={refresh} />
      ) : items === undefined ? (
        <RowsSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState icon={Quote} title="No reviews yet" body="Add reviews people left for ONA on Google."
          action={<Button className="h-11" onClick={() => setEditing("new")}>Add review</Button>} />
      ) : (
        <ol className="space-y-3">
          {items.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => setEditing(t)}
                className="w-full rounded-xl border border-border-default bg-surface p-4 text-left hover:border-ink-mute sm:p-5">
                <span className="flex items-start justify-between gap-3">
                  <b className="text-[15px] text-ink">
                    {t.author}
                    {t.rating ? (
                      <span className="ml-2 inline-flex items-center gap-0.5 align-middle text-[13px] font-bold text-ink-dim">
                        <Star aria-hidden="true" className="size-3.5 fill-[#F5B301] text-[#F5B301]" />
                        {t.rating}
                      </span>
                    ) : null}
                  </b>
                  {t.is_published ? <Badge className="bg-ok-bg text-ok">Shown</Badge> : <Badge variant="outline">Hidden</Badge>}
                </span>
                <span className="mt-1 line-clamp-2 block whitespace-pre-line text-[14px] text-ink-dim">{t.quote}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null ? (
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-black">{editing === "new" ? "Add a review" : "Edit review"}</DialogTitle>
              <DialogDescription>Quote it as written. Only publish reviews people really left for ONA.</DialogDescription>
            </DialogHeader>
            <ReviewForm
              key={editing === "new" ? "new" : editing.id}
              existing={editing === "new" ? null : editing}
              nextOrder={(items ?? []).reduce((n, i) => Math.max(n, i.sort_order), 0) + 10}
              onCancel={() => setEditing(null)}
              onDone={(m) => { setEditing(null); toast.success(m); refresh(); }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function ReviewForm({ existing, nextOrder, onCancel, onDone }: {
  existing: AdminTestimonial | null; nextOrder: number; onCancel: () => void; onDone: (m: string) => void;
}) {
  const [quote, setQuote] = useState(existing?.quote ?? "");
  const [author, setAuthor] = useState(existing?.author ?? "");
  const [rating, setRating] = useState(existing ? (existing.rating?.toString() ?? NO_RATING) : "5");
  const [source, setSource] = useState<AdminTestimonial["source"]>(existing?.source ?? "google");
  const [published, setPublished] = useState(existing?.is_published ?? true);
  const [order, setOrder] = useState(String(existing?.sort_order ?? nextOrder));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    const body = {
      quote, author, rating: rating === NO_RATING ? null : Number(rating), source, is_published: published, sort_order: Number(order) || 100,
    };
    try {
      if (existing) await adminApi.updateTestimonial(existing.id, body);
      else await adminApi.createTestimonial(body);
      onDone(published ? "Saved. Visitors see it within a minute." : "Saved, hidden from the site.");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, String(Array.isArray(v) ? v[0] : v)])));
      } else setFormError(apiMessage(err, "Could not save."));
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    try {
      await adminApi.removeTestimonial(existing.id);
      onDone("Review removed.");
    } catch (err) {
      setFormError(apiMessage(err, "Could not remove it."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} noValidate className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="r-quote">Review</Label>
        <Textarea id="r-quote" value={quote} maxLength={600} rows={5} aria-invalid={Boolean(errors.quote)} onChange={(e) => setQuote(e.target.value)} />
        {errors.quote ? <p className="text-[13px] text-err">{errors.quote}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="r-author">Name shown</Label>
          <Input id="r-author" value={author} maxLength={80} placeholder="Ama K." aria-invalid={Boolean(errors.author)}
            onChange={(e) => setAuthor(e.target.value)} className="h-11 md:h-9" />
          {errors.author ? <p className="text-[13px] text-err">{errors.author}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="r-rating">Stars</Label>
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger id="r-rating" className="h-11 w-full sm:w-28 md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["5", "4", "3", "2", "1"].map((n) => <SelectItem key={n} value={n}>{n} ★</SelectItem>)}
              <SelectItem value={NO_RATING}>None</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="r-source">From</Label>
          <Select value={source} onValueChange={(v) => setSource(v as AdminTestimonial["source"])}>
            <SelectTrigger id="r-source" className="h-11 w-full sm:w-36 md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <div className="flex min-h-11 items-center gap-3">
          <Switch id="r-published" checked={published} onCheckedChange={setPublished} />
          <Label htmlFor="r-published" className="text-[14px] font-normal text-ink">Shown on the site</Label>
        </div>
        <div className="grid w-24 gap-1.5">
          <Label htmlFor="r-order">Order</Label>
          <Input id="r-order" inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} className="h-11 md:h-9" />
        </div>
      </div>
      {formError ? <p role="alert" className="text-[13px] text-err">{formError}</p> : null}
      <EditorFooter busy={busy} confirmLabel="Yes, remove it" onRemove={existing ? () => void remove() : undefined} onCancel={onCancel} />
    </form>
  );
}
