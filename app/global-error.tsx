"use client";

/**
 * Root layout crash.
 *
 * This replaces the entire document, so it MUST render its own <html> and
 * <body>. It also cannot rely on anything from the root layout — not the
 * font, not globals.css, not a shared component — because the thing that
 * failed may be exactly that.
 *
 * Everything here is therefore inline: no Tailwind classes, no imports, no
 * design tokens. That is deliberate duplication, and the one place in this
 * codebase where it is correct. A brand-perfect error page that itself fails
 * to render is worse than a plain one that always works.
 *
 * In practice this almost never fires. When it does, something is badly
 * wrong, and the only job is to say so in a way that does not frighten
 * someone whose money we are holding.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          // System stack: the webfont may be the thing that failed.
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          // Brand values hardcoded, since the tokens may not have loaded.
          background: "#FFFFFF",
          color: "#17151F",
        }}
      >
        {/* Static bars, drawn without CSS classes. */}
        <div
          aria-hidden="true"
          style={{ display: "flex", alignItems: "flex-end", gap: "5px", marginBottom: "32px" }}
        >
          {[32, 48, 12, 12, 40].map((h, i) => (
            <span
              key={i}
              style={{
                width: "7px",
                height: `${h}px`,
                borderRadius: "999px",
                background: i === 2 || i === 3 ? "rgba(107,104,120,0.4)" : "#C90007",
              }}
            />
          ))}
        </div>

        <p
          style={{
            margin: "0 0 12px",
            fontSize: "10.5px",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#6B6878",
          }}
        >
          Something broke
        </p>

        <h1
          style={{
            margin: "0 0 16px",
            fontSize: "clamp(28px, 5vw, 40px)",
            fontWeight: 900,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            maxWidth: "20ch",
          }}
        >
          The whole page stopped
        </h1>

        <p
          style={{
            margin: "0 0 36px",
            fontSize: "17px",
            lineHeight: 1.6,
            color: "#55525F",
            maxWidth: "48ch",
          }}
        >
          Something failed badly enough to take the page with it. Your bookings,
          projects and any money ONA is holding are all untouched.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "44px",
              padding: "0 24px",
              borderRadius: "10px",
              border: 0,
              background: "#C90007",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {/* A plain anchor, not next/link, on purpose. Link depends on the
              router — which is part of what may have just crashed. A full
              document navigation is the one thing guaranteed to work here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              minHeight: "44px",
              padding: "0 24px",
              borderRadius: "10px",
              border: "1px solid #E5E3EA",
              color: "#17151F",
              fontWeight: 700,
              fontSize: "15px",
              textDecoration: "none",
            }}
          >
            Back to the homepage
          </a>
        </div>

        {error.digest && (
          <p
            style={{
              marginTop: "36px",
              fontFamily: "ui-monospace, Consolas, monospace",
              fontSize: "10.5px",
              color: "#6B6878",
            }}
          >
            Reference: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
