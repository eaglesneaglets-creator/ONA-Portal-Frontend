import { ArrowUpRight, Star } from "lucide-react";

import { Marquee } from "@/components/landing/marquee";
import type { SiteContent } from "@/lib/api/content";

const SOURCE = { google: "on Google", facebook: "on Facebook", direct: "" } as const;

/** Seconds each card takes to pass: the loop lengthens with more reviews, the pace stays the same. */
const SECONDS_PER_REVIEW = 7;

/**
 * "What artists say": reviews ONA chose from the ones people left on Google,
 * quoted as written, in one row that scrolls itself (components/landing/
 * marquee.tsx), plus the overall rating as a link to Google's listing.
 *
 * Deliberately no review markup (schema.org Review/AggregateRating): Google
 * shows no stars for reviews a business publishes about itself, and the
 * full, unfiltered set is one click away on Google.
 */
export function LandingReviews({
  reviews,
  google,
  className = "",
}: {
  reviews: SiteContent["reviews"];
  google: SiteContent["google"];
  className?: string;
}) {
  if (!reviews.length) return null;
  return (
    <section aria-labelledby="reviews-h" className={className}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[40ch]">
            <p className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.14em] text-ona-red">Reviews</p>
            <h2 id="reviews-h" className="text-[clamp(26px,3.6vw,38px)] font-black leading-tight tracking-tight text-ink">
              What artists say about ONA
            </h2>
          </div>
          {google ? (
            <a
              href={google.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border-default bg-surface px-4 text-[14px] font-bold text-ink transition-colors hover:border-ink-mute"
            >
              <Star aria-hidden="true" className="size-4 fill-[#F5B301] text-[#F5B301]" />
              {google.rating} · {google.count} Google reviews
              <ArrowUpRight aria-hidden="true" className="size-4 text-ink-mute" />
              <span className="sr-only">(opens Google in a new tab)</span>
            </a>
          ) : null}
        </div>

        <Marquee seconds={reviews.length * SECONDS_PER_REVIEW} label="reviews">
          {reviews.map((r) => (
            <li key={r.id} className="flex w-[300px] sm:w-[360px]">
              <figure className="flex w-full flex-col rounded-xl border border-border-default bg-surface p-6 shadow-card transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-ona-red/40 hover:shadow-pop motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                {r.rating ? <Stars value={r.rating} /> : null}
                <blockquote className="mb-5 whitespace-pre-line text-[15.5px] leading-relaxed text-ink">
                  “{r.quote}”
                </blockquote>
                <figcaption className="mt-auto border-t border-border-soft pt-4 text-[14px] text-ink-dim">
                  <b className="text-ink">{r.author}</b>
                  {SOURCE[r.source] ? <span> · {SOURCE[r.source]}</span> : null}
                </figcaption>
              </figure>
            </li>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <p className="mb-3 flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={n <= value ? "size-4 fill-[#F5B301] text-[#F5B301]" : "size-4 text-border-default"}
        />
      ))}
    </p>
  );
}
