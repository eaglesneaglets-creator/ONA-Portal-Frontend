"use client";

import { Images, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MediaPicker } from "@/components/admin/website/media-picker";
import { MediaThumb } from "@/components/admin/website/media-thumb";
import { EditorFooter } from "@/components/dashboard/editor-footer";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminApi, type AdminGalleryItem } from "@/lib/api/admin";
import { apiMessage } from "@/components/admin/website/api-message";

/** The homepage's "Inside ONA" photos: add from the library, caption, order, hide. */
export function GalleryEditor() {
  const [items, setItems] = useState<AdminGalleryItem[] | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<AdminGalleryItem | null>(null);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    adminApi.gallery().then((g) => live && setItems(g)).catch(() => live && setItems(null));
    return () => {
      live = false;
    };
  }, [reload]);

  async function add(mediaId: string) {
    setPicking(false);
    try {
      const next = (items ?? []).reduce((n, i) => Math.max(n, i.sort_order), 0) + 10;
      await adminApi.createGalleryItem({ media: mediaId, sort_order: next });
      toast.success("Added to the gallery. Visitors see it within a minute.");
      refresh();
    } catch (err) {
      toast.error(apiMessage(err, "Could not add it."));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[60ch] text-[14px] text-ink-dim">
          Photos of the rooms, the gear and sessions, shown on the homepage under &ldquo;Inside ONA&rdquo;. The section stays hidden until at least one is published.
        </p>
        <Button className="h-11 md:h-9" onClick={() => setPicking(true)}>
          <Plus aria-hidden="true" />
          Add photo
        </Button>
      </div>

      {items === null ? (
        <ErrorState message="The gallery could not be loaded." onRetry={refresh} />
      ) : items === undefined ? (
        <RowsSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={Images} title="No photos yet" body="Add ONA's own photos: the live room, the control room, a band mid-session."
          action={<Button className="h-11" onClick={() => setPicking(true)}>Add photo</Button>} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((g) => (
            <li key={g.id}>
              <button type="button" onClick={() => setEditing(g)}
                className="block w-full rounded-xl border border-border-default bg-surface p-2 text-left hover:border-ink-mute">
                <MediaThumb src={g.media_detail.src} alt={g.media_detail.alt} className="aspect-[4/3]" />
                <span className="mt-2 flex items-start justify-between gap-2 px-1">
                  <span className="line-clamp-2 text-[13px] text-ink">{g.caption || <i className="text-ink-mute">No caption</i>}</span>
                  {g.is_published ? null : <Badge variant="outline">Hidden</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <MediaPicker open={picking} onOpenChange={setPicking} title="Add a photo to the gallery" onPick={(m) => void add(m.id)} />

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing ? (
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-black">Gallery photo</DialogTitle>
              <DialogDescription>Removing it from the gallery keeps the image in the media library.</DialogDescription>
            </DialogHeader>
            <GalleryForm key={editing.id} item={editing} onCancel={() => setEditing(null)}
              onDone={(m) => { setEditing(null); toast.success(m); refresh(); }} />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function GalleryForm({ item, onCancel, onDone }: { item: AdminGalleryItem; onCancel: () => void; onDone: (m: string) => void }) {
  const [caption, setCaption] = useState(item.caption);
  const [published, setPublished] = useState(item.is_published);
  const [order, setOrder] = useState(String(item.sort_order));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateGalleryItem(item.id, { caption, is_published: published, sort_order: Number(order) || 100 });
      onDone("Saved.");
    } catch (err) {
      setError(apiMessage(err, "Could not save."));
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await adminApi.removeGalleryItem(item.id);
      onDone("Removed from the gallery.");
    } catch (err) {
      setError(apiMessage(err, "Could not remove it."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} noValidate className="grid gap-3">
      <MediaThumb src={item.media_detail.src} alt={item.media_detail.alt} className="aspect-[16/9]" sizes="480px" />
      <div className="grid gap-1.5">
        <Label htmlFor="g-caption">Caption (optional)</Label>
        <Input id="g-caption" value={caption} maxLength={140} onChange={(e) => setCaption(e.target.value)} className="h-11 md:h-9" />
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <div className="flex min-h-11 items-center gap-3">
          <Switch id="g-published" checked={published} onCheckedChange={setPublished} />
          <Label htmlFor="g-published" className="text-[14px] font-normal text-ink">Shown on the site</Label>
        </div>
        <div className="grid w-24 gap-1.5">
          <Label htmlFor="g-order">Order</Label>
          <Input id="g-order" inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} className="h-11 md:h-9" />
        </div>
      </div>
      {error ? <p role="alert" className="text-[13px] text-err">{error}</p> : null}
      <EditorFooter busy={busy} confirmLabel="Yes, remove it" onRemove={() => void remove()} onCancel={onCancel} />
    </form>
  );
}
