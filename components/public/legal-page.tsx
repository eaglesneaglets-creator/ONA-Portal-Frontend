import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export type LegalSection = { title: string; intro?: string; points: React.ReactNode[] };

/**
 * The shared frame of /legal/terms and /legal/privacy: a heading block with
 * the date the wording last changed, then numbered sections of bullet
 * points, each a labelled region so a screen reader can jump between them.
 * `children` follows the sections (the terms' acknowledgement).
 */
export function LegalPage({
  eyebrow,
  title,
  updated,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  sections: LegalSection[];
  children?: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-3xl px-4 pb-[clamp(72px,10vw,128px)] sm:px-6">
        <section className="py-12 sm:py-16">
          <p className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.14em] text-ona-red">{eyebrow}</p>
          <h1 className="mb-3 text-[clamp(30px,5vw,44px)] font-black leading-tight tracking-tight text-ink">{title}</h1>
          <p className="text-[15px] text-ink-mute">Last updated {updated}</p>
        </section>

        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title} aria-labelledby={slug(s.title)}>
              <h2 id={slug(s.title)} className="mb-3 text-[20px] font-black tracking-tight text-ink">
                {s.title}
              </h2>
              {s.intro ? <p className="mb-2 text-[16px] leading-relaxed text-ink-dim">{s.intro}</p> : null}
              <ul className="list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-ink-dim marker:text-ona-red">
                {s.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

function slug(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
