"use client";

import { ImageIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MediaThumb } from "@/components/admin/website/media-thumb";
import { MediaUpload } from "@/components/admin/website/media-upload";
import { EditorFooter } from "@/components/dashboard/editor-footer";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Badge } from "@/components/ui/badge";
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
              onDone={(msg) => { setEditing(null); toast.success(msg); refresh(); }} />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function MediaForm({ item, onCancel, onDone }: { item: AdminMedia; onCancel: () => void; onDone: (m: string) => void }) {
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

  return (
    <form onSubmit={(e) => void save(e)} noValidate className="grid gap-3">
      <MediaThumb src={item.src} alt={item.alt_text} className="aspect-[16/9]" sizes="480px" />
      <div className="grid gap-1.5">
        <Label htmlFor="m-alt">What the picture shows</Label>
        <Input id="m-alt" value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} className="h-11 md:h-9" />
      </div>
      {error ? <p role="alert" className="text-[13px] text-err">{error}</p> : null}
      <EditorFooter busy={busy} confirmLabel="Yes, delete it" onRemove={() => void remove()} onCancel={onCancel} />
    </form>
  );
}
