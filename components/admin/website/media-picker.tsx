"use client";

import { useEffect, useState } from "react";

import { MediaThumb } from "@/components/admin/website/media-thumb";
import { MediaUpload } from "@/components/admin/website/media-upload";
import { RowsSkeleton } from "@/components/dashboard/states";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminApi, type AdminMedia } from "@/lib/api/admin";

/** Choose an image from the library, or upload a new one and use it straight away. */
export function MediaPicker({
  open,
  onOpenChange,
  onPick,
  title = "Choose an image",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (m: AdminMedia) => void;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-black">{title}</DialogTitle>
          <DialogDescription>Upload a new photo, or pick one already in the media library.</DialogDescription>
        </DialogHeader>
        <MediaUpload compact onUploaded={(m) => onPick(m)} />
        <h3 className="mt-2 text-[15px] font-black text-ink">In the library</h3>
        {/* Mounted with the dialog, so every opening lists the library afresh. */}
        <LibraryGrid onPick={onPick} />
      </DialogContent>
    </Dialog>
  );
}

function LibraryGrid({ onPick }: { onPick: (m: AdminMedia) => void }) {
  const [items, setItems] = useState<AdminMedia[] | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    adminApi
      .media()
      .then((p) => live && setItems(p.results))
      .catch(() => live && setItems(null));
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
        {items === undefined ? (
          <RowsSkeleton rows={2} />
        ) : items === null ? (
          <p className="text-[14px] text-err">The library could not be loaded. Close this and try again.</p>
        ) : items.length === 0 ? (
          <p className="text-[14px] text-ink-dim">Nothing uploaded yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onPick(m)}
                  className="group block w-full rounded-xl border border-border-default p-1.5 text-left hover:border-ona-red focus-visible:border-ona-red"
                >
                  <MediaThumb src={m.src} alt={m.alt_text} className="aspect-[4/3]" />
                  <span className="mt-1.5 line-clamp-1 block px-1 text-[12.5px] text-ink-dim">
                    {m.alt_text || "No description"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </>
  );
}
