import type { SiteContent } from "@/lib/api/content";

import { GalleryGrid } from "./gallery-grid";

/**
 * "Inside ONA": the photos ONA publishes from the console's gallery. Hidden
 * until there is at least one, so the page never shows an empty frame.
 *
 * Every tile has the same 4:3 shape and the column count follows the number of
 * photos, so two photos fill the row instead of leaving a gap, and a tall phone
 * photo cannot stretch the section. Tapping a tile shows the whole photo.
 */
export function LandingGallery({
  items,
  className = "",
}: {
  items: SiteContent["gallery"];
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="gallery-h" className={className}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-[56ch]">
          <p className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.14em] text-ona-red">Inside ONA</p>
          <h2 id="gallery-h" className="text-[clamp(26px,3.6vw,38px)] font-black leading-tight tracking-tight text-ink">
            The rooms, the gear, the sessions
          </h2>
        </div>
        <GalleryGrid items={items} />
      </div>
    </section>
  );
}
