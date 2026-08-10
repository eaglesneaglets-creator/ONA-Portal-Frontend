/**
 * Token smoke page.
 *
 * Task 11's verification is "a page renders in ONA tokens, not Tailwind
 * defaults". A page that merely looks plausible does not prove that — a
 * missing token silently falls back to something reasonable.
 *
 * So this page names every token and shows it. If `bg-ona-blue` renders
 * grey, or a radius is square, it is visible immediately rather than
 * discovered three screens later.
 *
 * This is scaffolding. It is replaced by the real homepage in Task 14.
 */

const BRAND = [
  { name: "ona-blue", hex: "#00108F", className: "bg-ona-blue" },
  { name: "ona-secondary", hex: "#310C6D", className: "bg-ona-secondary" },
  { name: "ona-median", hex: "#64084B", className: "bg-ona-median" },
  { name: "ona-tertiary", hex: "#970429", className: "bg-ona-tertiary" },
  { name: "ona-red", hex: "#C90007", className: "bg-ona-red" },
];

const SIGNALS = [
  { name: "ok", ratio: "5.3:1", fg: "text-ok", bg: "bg-ok-bg" },
  { name: "warn", ratio: "5.6:1", fg: "text-warn", bg: "bg-warn-bg" },
  { name: "err", ratio: "6.4:1", fg: "text-err", bg: "bg-err-bg" },
  { name: "info", ratio: "14.2:1", fg: "text-info", bg: "bg-info-bg" },
];

const RADII = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
  { name: "pill", className: "rounded-pill" },
];

export default function TokenCheck() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <header className="mb-12">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-mute">
          Task 11 · token check
        </p>
        <h1 className="mb-3 text-5xl font-black tracking-tight text-ink">
          Design tokens are live
        </h1>
        <p className="max-w-prose text-lg leading-relaxed text-ink-dim">
          Every swatch below is a Tailwind utility generated from{" "}
          <code className="rounded-sm bg-surface-sunk px-1.5 py-0.5 font-mono text-base">
            @theme
          </code>
          . If any renders as a default grey, that token did not port.
        </p>
      </header>

      {/* Gradient — the one token that is not a colour utility. */}
      <section className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-ink-mute">
          Brand gradient
        </h2>
        <div className="bg-ona-gradient flex min-h-44 flex-col justify-end rounded-xl p-8 shadow-pop">
          <p className="text-3xl font-black tracking-tight text-white">
            Book the room. Hire the talent.
          </p>
          <p className="mt-1 text-white/80">
            152° · blue → secondary → median → red
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-ink-mute">
          Brand colours
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {BRAND.map((c) => (
            <div key={c.name}>
              <div
                className={`${c.className} mb-2 h-20 rounded-md shadow-card`}
              />
              <p className="text-sm font-bold text-ink">{c.name}</p>
              <p className="font-mono text-xs text-ink-mute">{c.hex}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ink and signals carry their measured contrast, because two of these
          were fixed after failing WCAG AA. Showing the number keeps the
          reason visible. */}
      <section className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-ink-mute">
          Ink · contrast on white
        </h2>
        <div className="space-y-1 rounded-lg border border-border-default bg-surface p-6 shadow-card">
          <p className="text-lg text-ink">ink — 16.1:1 — body copy</p>
          <p className="text-lg text-ink-dim">ink-dim — 7.4:1 — secondary</p>
          <p className="text-lg text-ink-mute">
            ink-mute — 5.1:1 — meta (was 3.1:1, which failed AA)
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-ink-mute">
          Signals
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SIGNALS.map((s) => (
            <div key={s.name} className={`${s.bg} rounded-md p-4`}>
              <p className={`${s.fg} font-bold`}>{s.name}</p>
              <p className={`${s.fg} font-mono text-xs opacity-80`}>
                {s.ratio}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-ink-mute">
          Radii
        </h2>
        {/* Bordered, not filled: at 64px a 6px and a 10px corner are almost
            indistinguishable as solid blocks. An outline makes the curve
            readable, which is the entire point of showing them. */}
        <div className="flex flex-wrap items-end gap-4">
          {RADII.map((r) => (
            <div key={r.name} className="text-center">
              <div
                className={`${r.className} mb-2 h-20 w-20 border-2 border-ona-blue bg-surface-alt`}
              />
              <p className="text-xs text-ink-mute">{r.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-ink-mute">
          Type — Lato, four weights
        </h2>
        <div className="space-y-2 rounded-lg border border-border-default p-6">
          <p className="text-4xl font-black tracking-tight text-ink">
            900 · display headings
          </p>
          <p className="text-2xl font-bold text-ink">700 · emphasis</p>
          <p className="text-lg font-normal text-ink-dim">400 · body copy</p>
          <p className="text-lg font-light text-ink-mute">300 · quiet meta</p>
        </div>
      </section>

      {/* Tap target and focus ring, both of which the audit had to correct. */}
      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-ink-mute">
          Controls
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-[var(--tap-min)] rounded-md bg-ona-red px-6 font-bold text-white transition-colors hover:bg-ona-tertiary"
          >
            Primary
          </button>
          <button
            type="button"
            className="min-h-[var(--tap-min)] rounded-md border border-border-default bg-surface px-6 font-bold text-ink transition-colors hover:border-ink-mute"
          >
            Secondary
          </button>
        </div>
        <p className="mt-3 text-sm text-ink-mute">
          Both are 44px tall — the minimum the audit held every control to. Tab
          to them to see the focus ring.
        </p>
      </section>
    </main>
  );
}
