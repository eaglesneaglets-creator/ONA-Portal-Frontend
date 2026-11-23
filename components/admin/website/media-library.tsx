"use client";

import { ImageIcon, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MediaThumb } from "@/components/admin/website/media-thumb";
import { MediaUpload } from "@/components/admin/website/media-upload";
import { EditorFooter } from "@/components/dashboard/editor-footer";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi, type AdminMedia } from "@/lib/api/admin";
import { apiMessage } from "@/components/admin/website/api-message";

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/** Every image uploaded for the website: upload, describe, delete what is no longer used. */
export function MediaLibrary() {
  const [items, setItems] = useState<AdminMedia[] | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<AdminMedia | null>(null);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    adminApi.media().then((p) => live && setItems(p.results)).catch(() => live && setItems(null));
    return () => {
      live = false;
    };
  }, [reload]);

  // While the worker is enhancing a photo, check back every few seconds.
  const pending = items?.some((m) => m.enhance_status === "pending") ?? false;
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [pending, refresh]);

  return (
    <div className="grid gap-6">
      <MediaUpload onUploaded={refresh} />
      {items === null ? (
        <ErrorState message="The media library could not be loaded." onRetry={refresh} />
      ) : items === undefined ? (
        <RowsSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No images yet" body="Upload ONA's own photos here, then use them for the homepage and the gallery." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setEditing(m)}
                className="block w-full rounded-xl border border-border-default bg-surface p-2 text-left hover:border-ink-mute">
                <MediaThumb src={m.src} alt={m.alt_text} className="aspect-[4/3]" />
                <span className="mt-2 block px-1">
                  <span className="line-clamp-1 text-[13px] text-ink">{m.alt_text || <i className="text-ink-mute">No description</i>}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-mute">
                    {m.width}×{m.height} · {kb(m.bytes)}
                    {m.used_by.length ? <Badge className="bg-ok-bg text-ok">In use</Badge> : null}
                    <EnhanceBadge m={m} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing ? (
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-black">Image</DialogTitle>
              <DialogDescription>
                {editing.used_by.length ? `Shown on ${editing.used_by.join(" and ")}.` : "Not used on the site yet."}
              </DialogDescription>
            </DialogHeader>
            <MediaForm key={editing.id} item={editing} onCancel={() => setEditing(null)}
              onDone={(msg) => { setEditing(null); toast.success(msg); refresh(); }}
              onEnhancing={() => { setEditing(null); toast.success("Enhancing. The sharper copy replaces it on the site in about a minute."); refresh(); }} />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function EnhanceBadge({ m }: { m: AdminMedia }) {
  if (m.enhance_status === "pending") return <Badge className="bg-info-bg text-info">Enhancing…</Badge>;
  if (m.enhanced_from) return <Badge className="bg-info-bg text-info">Enhanced</Badge>;
  if (m.enhance_status === "failed") return <Badge className="bg-err-bg text-err">Enhance failed</Badge>;
  if (m.is_small && m.enhance_status !== "done") return <Badge className="bg-warn-bg text-warn">Small</Badge>;
  return null;
}

function MediaForm({ item, onCancel, onDone, onEnhancing }: {
  item: AdminMedia; onCancel: () => void; onDone: (m: string) => void; onEnhancing: () => void;
}) {
  const [alt, setAlt] = useState(item.alt_text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateMedia(item.id, alt);
      onDone("Description saved.");
    } catch (err) {
      setError(apiMessage(err, "Could not save."));
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await adminApi.removeMedia(item.id);
      onDone("Image deleted.");
    } catch (err) {
      // 409: the site still shows it; the message says where.
      setError(apiMessage(err, "Could not delete it."));
      setBusy(false);
    }
  }

  async function enhance() {
    setBusy(true);
    setError(null);
    try {
      await adminApi.enhanceMedia(item.id);
      onEnhancing();
    } catch (err) {
      setError(apiMessage(err, "Could not start enhancing."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} noValidate className="grid gap-3">
      <MediaThumb src={item.src} alt={item.alt_text} className="aspect-[16/9]" sizes="480px" />
      <EnhancePanel item={item} busy={busy} onEnhance={() => void enhance()} />
      <div className="grid gap-1.5">
        <Label htmlFor="m-alt">What the picture shows</Label>
        <Input id="m-alt" value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} className="h-11 md:h-9" />
      </div>
      {error ? <p role="alert" className="text-[13px] text-err">{error}</p> : null}
      <EditorFooter busy={busy} confirmLabel="Yes, delete it" onRemove={() => void remove()} onCancel={onCancel} />
    </form>
  );
}

/**
 * Small photos look soft on large screens. Enhance makes an AI-upscaled copy
 * (Real-ESRGAN, run by the worker) that takes this photo's place on the site;
 * this one stays in the library.
 */
function EnhancePanel({ item, busy, onEnhance }: { item: AdminMedia; busy: boolean; onEnhance: () => void }) {
  if (item.enhanced_from) {
    return <p className="rounded-lg bg-info-bg px-3 py-2 text-[13px] text-info">An AI-enhanced copy of an earlier, smaller photo.</p>;
  }
  if (item.enhance_status === "pending") {
    return <p role="status" className="rounded-lg bg-info-bg px-3 py-2 text-[13px] text-info">Enhancing… this usually takes under a minute.</p>;
  }
  if (item.enhance_status === "done") {
    return <p className="rounded-lg bg-ok-bg px-3 py-2 text-[13px] text-ok">Enhanced: the sharper copy is in the library and on the site in this photo&apos;s place.</p>;
  }
  if (!item.is_small) return null;
  return (
    <div className="grid gap-2 rounded-lg border border-warn/30 bg-warn-bg px-3 py-3 text-[13px] text-warn">
      <p>
        At {item.width}×{item.height} this photo is small and may look soft on laptops and sharp phone screens.
        Enhance makes a 2–4× larger copy with AI and puts it on the site in its place. AI sharpens blur and
        compression well, but fine detail is its best guess.
      </p>
      {item.enhance_status === "failed" && item.enhance_error ? <p className="text-err">Last try: {item.enhance_error}</p> : null}
      <Button type="button" variant="outline" disabled={busy} onClick={onEnhance} className="h-11 justify-self-start bg-surface md:h-9">
        <Sparkles aria-hidden className="size-4" />
        {item.enhance_status === "failed" ? "Try enhancing again" : "Enhance photo"}
      </Button>
    </div>
  );
}
