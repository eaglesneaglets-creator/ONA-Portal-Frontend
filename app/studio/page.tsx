import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/public/site-header";
import { fetchCatalogue, formatDuration, type Engineer, type Room, type Service } from "@/lib/api/studio";

/**
 * Public studio catalogue — /studio.
 *
 * Ports the "Studio time" and services sections of
 * docs/design/pages/services.html, fed by the live API instead of the
 * template's hardcoded Studio A / Studio B. The marketplace section of that
 * template is deferred with the rest of the professional workflow (ADR-015).
 *
 * Server component. fetch() here is uncached (Cache Components is off), so
 * every request renders the current catalogue — right for a page staff edit
 * in admin and expect to see change immediately.
 *
 * Mobile-first (ADR-013): single column at 390px, grid from md up.
 */

export const metadata: Metadata = {
  title: "Studio time and services",
  description:
    "Clear prices for ONA Records studio rooms and services, before you commit. Engineer included.",
};

export default async function StudioCataloguePage() {
  const { rooms, engineers, services, unavailable } = await fetchCatalogue();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-6">
        <section className="py-12 sm:py-16">
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-mute">
            Studio
          </p>
          <h1 className="mb-4 max-w-[20ch] text-[clamp(30px,5vw,46px)] font-black leading-[1.08] tracking-tight text-ink">
            Clear prices, before you commit
          </h1>
          <p className="max-w-[56ch] text-[17px] leading-relaxed text-ink-dim">
            Studio time is charged by the hour with the engineer included. Pick a room, a
            service and a time, and pay in GHS by Mobile Money or card.
          </p>
        </section>

        {unavailable ? <Unavailable /> : null}

        <Section
          title="Studio time"
          lede="Every room comes with a recording engineer. Minimum booking is one hour."
          empty="No rooms are open for booking right now."
          items={rooms}
          render={(room) => <RoomCard key={room.id} room={room} />}
        />

        <Section
          title="Services"
          lede="What a session is for. Prices are for one unit of the stated length."
          empty="No services are listed right now."
          items={services}
          render={(svc) => <ServiceCard key={svc.id} service={svc} />}
        />

        <Section
          title="Engineers"
          lede="Who you can book with. Every session includes one."
          empty="No engineers are listed right now."
          items={engineers}
          render={(eng) => <EngineerCard key={eng.id} engineer={eng} />}
        />
      </main>
    </>
  );
}

function Section<T>({
  title,
  lede,
  empty,
  items,
  render,
}: {
  title: string;
  lede: string;
  empty: string;
  items: T[];
  render: (item: T) => React.ReactNode;
}) {
  return (
    <section className="border-t border-border-soft py-10 sm:py-14" aria-labelledby={slug(title)}>
      <div className="mb-7 max-w-[56ch]">
        <h2 id={slug(title)} className="mb-2 text-[clamp(22px,3vw,30px)] font-black tracking-tight text-ink">
          {title}
        </h2>
        <p className="text-[15px] leading-relaxed text-ink-dim">{lede}</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default px-5 py-8 text-center text-[15px] text-ink-mute">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map(render)}</ul>
      )}
    </section>
  );
}

function RoomCard({ room }: { room: Room }) {
  return (
    <li className="flex flex-col rounded-xl border border-border-default bg-surface p-6">
      <h3 className="mb-2 text-[19px] font-black tracking-tight text-ink">{room.name}</h3>
      <p className="mb-4 flex items-baseline gap-1.5">
        <span className="text-[26px] font-black leading-none text-ink">{room.hourly_rate_display}</span>
        <span className="text-[13px] font-bold text-ink-mute">per hour</span>
      </p>
      {room.description ? (
        <p className="mb-5 text-[14.5px] leading-relaxed text-ink-dim">{room.description}</p>
      ) : null}
      <dl className="mb-6 mt-auto text-[13.5px] text-ink-dim">
        <div className="flex justify-between border-t border-border-soft py-2">
          <dt>Capacity</dt>
          <dd className="font-bold text-ink">
            {room.capacity} {room.capacity === 1 ? "person" : "people"}
          </dd>
        </div>
        <div className="flex justify-between border-t border-border-soft py-2">
          <dt>Engineer</dt>
          <dd className="font-bold text-ink">Included</dd>
        </div>
      </dl>
      <Link
        href={`/register?next=${encodeURIComponent(`/customer/book?room=${room.id}`)}`}
        className="flex min-h-[var(--tap-min)] items-center justify-center rounded-md bg-ona-red px-5 font-bold text-white transition-colors hover:bg-ona-tertiary"
      >
        Book {room.name}
      </Link>
    </li>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <li className="flex flex-col rounded-xl border border-border-default bg-surface p-6">
      <h3 className="mb-2 text-[19px] font-black tracking-tight text-ink">{service.name}</h3>
      <p className="mb-4 flex items-baseline gap-1.5">
        <span className="text-[26px] font-black leading-none text-ink">{service.base_price_display}</span>
        <span className="text-[13px] font-bold text-ink-mute">
          per {formatDuration(service.duration_minutes)}
        </span>
      </p>
      {service.description ? (
        <p className="text-[14.5px] leading-relaxed text-ink-dim">{service.description}</p>
      ) : null}
    </li>
  );
}

function EngineerCard({ engineer }: { engineer: Engineer }) {
  return (
    <li className="rounded-xl border border-border-default bg-surface p-6">
      <h3 className="mb-2 text-[19px] font-black tracking-tight text-ink">{engineer.name}</h3>
      {engineer.specialties.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {engineer.specialties.map((s) => (
            <li
              key={s}
              className="rounded-pill bg-surface-sunk px-2.5 py-1 text-[12px] font-bold text-ink-dim"
            >
              {s}
            </li>
          ))}
        </ul>
      ) : null}
      {engineer.bio ? (
        <p className="text-[14.5px] leading-relaxed text-ink-dim">{engineer.bio}</p>
      ) : null}
    </li>
  );
}

function Unavailable() {
  return (
    <p
      role="status"
      className="mb-6 rounded-lg border border-warn/30 bg-warn-bg px-5 py-4 text-[14.5px] text-warn"
    >
      Live prices are unavailable at the moment. Please try again shortly — nothing has
      happened to any booking or payment.
    </p>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
