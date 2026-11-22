import Image from "next/image";

import type { SiteContent } from "@/lib/api/content";
import { MEDIA_UNOPTIMIZED, mediaSrc } from "@/lib/media";

/**
 * "Inside ONA": the photos ONA publishes from the console's gallery. Hidden
 * until there is at least one, so the page never shows an empty frame.
 * Each photo keeps its own shape in a masonry of columns, so nothing is
 * cropped out.
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
        <ul className="ona-reveal columns-1 gap-4 sm:columns-2 lg:columns-3">
          {items.map(({ id, caption, image }) => (
            <li key={id} className="mb-4 break-inside-avoid">
              <figure className="overflow-hidden rounded-xl border border-border-default bg-surface">
                <Image
                  src={mediaSrc(image.src)}
                  alt={image.alt || caption}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                  unoptimized={MEDIA_UNOPTIMIZED}
                  className="h-auto w-full"
                />
                {caption ? <figcaption className="px-4 py-3 text-[14px] text-ink-dim">{caption}</figcaption> : null}
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
