"use client";

import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { SiteContent } from "@/lib/api/content";
import { MEDIA_UNOPTIMIZED, mediaSrc } from "@/lib/media";

type Item = SiteContent["gallery"][number];
type Cols = 1 | 2 | 3 | 4;

/**
 * Columns per breakpoint for n photos: rows that fill, and a last row that is
 * centred rather than left hanging. One photo is shown at a readable width,
 * not stretched across a laptop.
 */
export function columnsFor(n: number): { base: Cols; sm: Cols; lg: Cols } {
  if (n <= 1) return { base: 1, sm: 1, lg: 1 };
  // Two photos stack on a phone: side by side they would be thumbnails.
  if (n === 2) return { base: 1, sm: 2, lg: 2 };
  if (n === 3) return { base: 2, sm: 3, lg: 3 };
  if (n === 4) return { base: 2, sm: 2, lg: 4 };
  return { base: 2, sm: 3, lg: n % 4 === 0 ? 4 : 3 };
}

// Literal class names, so Tailwind sees every one. Widths subtract the 1rem gaps.
const W: Record<Cols, string> = {
  1: "w-full", 2: "w-[calc((100%-1rem)/2)]", 3: "w-[calc((100%-2rem)/3)]", 4: "w-[calc((100%-3rem)/4)]",
};
const SM: Record<Cols, string> = {
  1: "sm:w-full", 2: "sm:w-[calc((100%-1rem)/2)]", 3: "sm:w-[calc((100%-2rem)/3)]", 4: "sm:w-[calc((100%-3rem)/4)]",
};
const LG: Record<Cols, string> = {
  1: "lg:w-full", 2: "lg:w-[calc((100%-1rem)/2)]", 3: "lg:w-[calc((100%-2rem)/3)]", 4: "lg:w-[calc((100%-3rem)/4)]",
};

export function GalleryGrid({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const cols = columnsFor(items.length);
  // The page's content column is at most 72rem (1152 px) wide.
  const sizes = `(min-width: 1024px) ${Math.round(1152 / cols.lg)}px, (min-width: 640px) ${Math.round(100 / cols.sm)}vw, ${Math.round(100 / cols.base)}vw`;

  const step = useCallback(
    (by: number) => setOpen((i) => (i === null ? i : (i + by + items.length) % items.length)),
    [items.length],
  );
  const current = open === null ? null : items[open];

  return (
    <>
      <ul className={`ona-reveal flex flex-wrap justify-center gap-4 ${items.length === 1 ? "mx-auto max-w-3xl" : ""}`}>
        {items.map(({ id, caption, image }, i) => (
          // On a phone an odd count leads with one full-width photo, then pairs: nothing sits alone.
          <li key={id} className={`${i === 0 && cols.base === 2 && items.length % 2 ? W[1] : W[cols.base]} ${SM[cols.sm]} ${LG[cols.lg]}`}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`View photo: ${image.alt || caption || `photo ${i + 1}`}`}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl border border-border-default bg-surface-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ona-blue"
            >
              <Image
                src={mediaSrc(image.src)}
                alt={image.alt || caption}
                fill
                sizes={sizes}
                unoptimized={MEDIA_UNOPTIMIZED}
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
              {caption ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-2.5 pt-8 text-left text-[13px] font-medium text-white sm:text-[14px]">
                  <span className="line-clamp-2">{caption}</span>
                </span>
              ) : null}
              <span aria-hidden className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Expand className="size-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={current !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {current ? (
          <DialogContent
            className="max-w-[calc(100%-1rem)] gap-3 bg-ink p-2 text-white ring-white/10 sm:max-w-5xl sm:p-3"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") step(1);
              if (e.key === "ArrowLeft") step(-1);
            }}
          >
            <DialogTitle className="sr-only">{current.image.alt || current.caption || "Photo"}</DialogTitle>
            <DialogDescription className="sr-only">
              Photo {open! + 1} of {items.length}. Use the arrow keys to move between photos.
            </DialogDescription>
            <div className="relative grid place-items-center">
              <Image
                key={current.id}
                src={mediaSrc(current.image.src)}
                alt={current.image.alt || current.caption}
                width={current.image.width}
                height={current.image.height}
                sizes="(min-width: 1024px) 1000px, 100vw"
                unoptimized={MEDIA_UNOPTIMIZED}
                className="h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
            <div className="flex items-center gap-2 px-1 pb-1">
              <p className="min-w-0 flex-1 text-[14px] text-white/85">
                {current.caption || null}
                <span className="ml-2 text-white/50 tabular-nums">{open! + 1} / {items.length}</span>
              </p>
              {items.length > 1 ? (
                <>
                  <Button type="button" variant="ghost" size="icon" onClick={() => step(-1)} aria-label="Previous photo"
                    className="size-11 text-white hover:bg-white/10 hover:text-white">
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => step(1)} aria-label="Next photo"
                    className="size-11 text-white hover:bg-white/10 hover:text-white">
                    <ChevronRight className="size-5" />
                  </Button>
                </>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
