"use client";

import { ExternalLink, MessageCircleQuestion, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { FormError } from "@/components/auth/fields";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminApi, type AdminFaq } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";

/**
 * /admin/content — the public FAQ (Task 16). Answers are policy: they show
 * on the homepage and /faqs within a minute or so of saving, and every change is
 * in the audit log with what it said before.
 */
export default function AdminContentPage() {
  const [faqs, setFaqs] = useState<AdminFaq[] | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<AdminFaq | "new" | null>(null);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    adminApi
      .faqs()
      .then((p) => live && setFaqs(p.results))
      .catch(() => live && setFaqs(null));
    return () => {
      live = false;
    };
  }, [reload]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Questions (FAQ)"
        description="The answers customers read on the homepage and the Questions page."
        actions={
          <>
            <Button asChild variant="outline" className="h-11 md:h-9">
              <Link href="/faqs" target="_blank">
                <ExternalLink aria-hidden="true" />
                View page
              </Link>
            </Button>
            <Button className="h-11 md:h-9" onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" />
              Add question
            </Button>
          </>
        }
      />

      {faqs === null ? (
        <ErrorState message="Questions could not be loaded." onRetry={refresh} />
      ) : faqs === undefined ? (
        <RowsSkeleton rows={4} />
      ) : faqs.length === 0 ? (
        <EmptyState icon={MessageCircleQuestion} title="No questions yet"
          body="Add the answers customers ask for most: payment, changes, what's included."
          action={<Button className="h-11" onClick={() => setEditing("new")}>Add question</Button>} />
      ) : (
        <ol className="space-y-3">
          {faqs.map((f) => (
            <li key={f.id}>
              <button type="button" data-testid="faq-row" onClick={() => setEditing(f)}
                className="w-full rounded-xl border border-border-default bg-surface p-4 text-left hover:border-ink-mute sm:p-5">
                <span className="flex items-start justify-between gap-3">
                  <b className="text-[15.5px] text-ink">{f.question}</b>
                  {f.is_published ? <Badge className="bg-ok-bg text-ok">Published</Badge> : <Badge variant="outline">Draft</Badge>}
                </span>
                <span className="mt-1 line-clamp-2 block text-[14px] text-ink-dim">{f.answer}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null ? (
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-black">{editing === "new" ? "Add a question" : "Edit question"}</DialogTitle>
              <DialogDescription>Write it the way a customer would ask it. Answer only what ONA has decided.</DialogDescription>
            </DialogHeader>
            <FaqForm
              key={editing === "new" ? "new" : editing.id}
              existing={editing === "new" ? null : editing}
              onCancel={() => setEditing(null)}
              onDone={(m) => {
                setEditing(null);
                toast.success(m);
                refresh();
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function FaqForm({ existing, onCancel, onDone }: { existing: AdminFaq | null; onCancel: () => void; onDone: (m: string) => void }) {
  const [question, setQuestion] = useState(existing?.question ?? "");
  const [answer, setAnswer] = useState(existing?.answer ?? "");
  const [published, setPublished] = useState(existing?.is_published ?? true);
  const [sortOrder, setSortOrder] = useState(String(existing?.sort_order ?? 100));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    const body = { question, answer, is_published: published, sort_order: Number(sortOrder) || 100 };
    try {
      if (existing) await adminApi.updateFaq(existing.id, body);
      else await adminApi.createFaq(body);
      onDone(published ? "Saved. Visitors see it within a minute or so." : "Saved as a draft.");
    } catch (err) {
      if (err instanceof ApiError) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fieldErrors)) fe[k] = v[0];
        setErrors(fe);
        setFormError(Object.keys(fe).length ? null : err.formError);
      } else setFormError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    try {
      await adminApi.removeFaq(existing.id);
      onDone("Question removed.");
    } catch {
      setFormError("Could not remove it.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} noValidate className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="faq-q">Question</Label>
        <Input id="faq-q" value={question} maxLength={200} onChange={(e) => setQuestion(e.target.value)} aria-invalid={Boolean(errors.question)} className="h-11 md:h-9" />
        {errors.question ? <p className="text-[13px] text-err">{errors.question}</p> : null}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="faq-a">Answer</Label>
        <Textarea id="faq-a" value={answer} maxLength={2000} rows={6} onChange={(e) => setAnswer(e.target.value)} aria-invalid={Boolean(errors.answer)} />
        {errors.answer ? <p className="text-[13px] text-err">{errors.answer}</p> : null}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <label className="flex min-h-11 items-center gap-2 text-[14px] text-ink">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="size-4 accent-ona-red" />
          Published on the site
        </label>
        <div className="grid w-24 gap-1.5">
          <Label htmlFor="faq-order">Order</Label>
          <Input id="faq-order" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-11 md:h-9" />
        </div>
      </div>
      <FormError message={formError} />
      <DialogFooter className="sm:justify-between">
        {existing ? (
          confirmRemove ? (
            <Button type="button" className="h-11 bg-err text-white hover:bg-err/90" disabled={busy} onClick={() => void remove()}>Yes, remove it</Button>
          ) : (
            <Button type="button" variant="ghost" className="h-11 text-err" disabled={busy} onClick={() => setConfirmRemove(true)}>Remove</Button>
          )
        ) : <span />}
        <span className="flex gap-2">
          <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="h-11" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </span>
      </DialogFooter>
    </form>
  );
}
