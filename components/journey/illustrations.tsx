/**
 * Small spot illustrations for the setup guides — the Shopify pattern of a
 * picture beside the active step, drawn in ONA's own colours and subject
 * (a mixing desk, a MoMo prompt, a session ticket) rather than stock art.
 *
 * Decorative: every one is aria-hidden, the step's text carries the meaning.
 * Plain SVG primitives with theme utilities, so they follow the tokens.
 */

const box = "h-[104px] w-[148px] flex-none";

export function IllusEnvelope() {
  return (
    <svg viewBox="0 0 148 104" className={box} aria-hidden="true">
      <rect x="18" y="20" width="112" height="70" rx="10" className="fill-surface stroke-border-default" strokeWidth="2" />
      <path d="M20 26 L74 62 L128 26" className="fill-none stroke-ona-blue" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="118" cy="24" r="14" className="fill-ok" />
      <path d="M111 24 l5 5 l9 -10" className="fill-none stroke-white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IllusPhone() {
  return (
    <svg viewBox="0 0 148 104" className={box} aria-hidden="true">
      <rect x="50" y="6" width="48" height="92" rx="9" className="fill-ink" />
      <rect x="55" y="16" width="38" height="70" rx="4" className="fill-surface" />
      <rect x="60" y="30" width="28" height="22" rx="4" className="fill-warn-bg" />
      <text x="74" y="44" textAnchor="middle" className="fill-warn" style={{ font: "900 8px Lato, sans-serif" }}>MoMo</text>
      <rect x="60" y="58" width="28" height="6" rx="3" className="fill-ona-red" />
      <rect x="60" y="68" width="18" height="4" rx="2" className="fill-border-default" />
      <path d="M106 34 q10 10 0 20 M114 28 q16 16 0 32" className="fill-none stroke-ona-blue" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function IllusCalendar() {
  return (
    <svg viewBox="0 0 148 104" className={box} aria-hidden="true">
      <rect x="22" y="14" width="104" height="80" rx="10" className="fill-surface stroke-border-default" strokeWidth="2" />
      <rect x="22" y="14" width="104" height="20" rx="10" className="fill-ona-blue" />
      <rect x="22" y="26" width="104" height="8" className="fill-ona-blue" />
      {[0, 1, 2, 3, 4].map((c) =>
        [0, 1, 2].map((r) => (
          <rect
            key={`${c}-${r}`}
            x={32 + c * 18}
            y={42 + r * 16}
            width="12"
            height="10"
            rx="3"
            className={c === 2 && r === 1 ? "fill-ona-red" : "fill-surface-sunk"}
          />
        )),
      )}
    </svg>
  );
}

export function IllusDeposit() {
  return (
    <svg viewBox="0 0 148 104" className={box} aria-hidden="true">
      {/* A session ticket torn at the half: deposit now, the rest on the day. */}
      <defs>
        <linearGradient id="ona-ticket" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00108f" />
          <stop offset="1" stopColor="#c90007" />
        </linearGradient>
      </defs>
      <rect x="20" y="22" width="108" height="62" rx="10" className="fill-surface stroke-border-default" strokeWidth="2" />
      <path d="M30 22 H74 V84 H30 a10 10 0 0 1 -10 -10 V32 a10 10 0 0 1 10 -10 Z" fill="url(#ona-ticket)" />
      <text x="47" y="58" textAnchor="middle" className="fill-white" style={{ font: "900 15px Lato, sans-serif" }}>50%</text>
      <text x="101" y="50" textAnchor="middle" className="fill-ink-mute" style={{ font: "700 8px Lato, sans-serif" }}>ON THE</text>
      <text x="101" y="62" textAnchor="middle" className="fill-ink-mute" style={{ font: "700 8px Lato, sans-serif" }}>DAY</text>
      <path d="M74 26 V80" className="stroke-border-default" strokeWidth="2" strokeDasharray="3 4" />
      <circle cx="74" cy="22" r="6" className="fill-surface-alt" />
      <circle cx="74" cy="84" r="6" className="fill-surface-alt" />
    </svg>
  );
}

export function IllusSession() {
  return (
    <svg viewBox="0 0 148 104" className={box} aria-hidden="true">
      {/* A mixing desk's faders */}
      <rect x="16" y="20" width="116" height="66" rx="10" className="fill-ink" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x={30 + i * 18} y="30" width="3" height="46" rx="1.5" className="fill-ink-dim" />
          <rect x={25 + i * 18} y={[60, 40, 52, 34, 46, 56][i]} width="13" height="8" rx="2" className={i === 3 ? "fill-ona-red" : "fill-surface"} />
        </g>
      ))}
    </svg>
  );
}

export function IllusLaunch() {
  return (
    <svg viewBox="0 0 148 104" className={box} aria-hidden="true">
      <rect x="18" y="16" width="112" height="72" rx="10" className="fill-surface stroke-border-default" strokeWidth="2" />
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <circle cx="36" cy={36 + r * 18} r="6" className={r < 2 ? "fill-ok" : "fill-surface-sunk stroke-border-default"} />
          <rect x="50" y={33 + r * 18} width={r === 2 ? 44 : 62} height="6" rx="3" className={r < 2 ? "fill-ink-dim" : "fill-border-default"} />
        </g>
      ))}
    </svg>
  );
}
