"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * A single row that scrolls itself (the shadcn/Magic UI "Marquee" pattern,
 * styles in app/globals.css: .ona-marquee). The items render twice; the
 * second copy is hidden from screen readers and only closes the loop.
 *
 * Moving content needs a way to stop it (WCAG 2.2.2): hovering or focusing
 * pauses it, and so does the Pause button, for touch and keyboard users.
 * With reduced motion the row stands still and scrolls by hand instead.
 */
export function Marquee({
  children,
  seconds,
  label,
}: {
  /** The items, each an <li>. */
  children: React.ReactNode;
  /** One full loop, in seconds: more items, longer loop, same pace. */
  seconds: number;
  /** What is scrolling, for the Pause button ("reviews"). */
  label: string;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <div>
      <div
        className="ona-marquee py-3"
        data-paused={paused || undefined}
        style={{ "--marquee-duration": `${seconds}s` } as React.CSSProperties}
      >
        <ul className="ona-marquee-track">{children}</ul>
        <ul className="ona-marquee-track" aria-hidden="true">
          {children}
        </ul>
      </div>
      <div className="mt-2 flex justify-end motion-reduce:hidden">
        <Button
          type="button"
          variant="ghost"
          className="h-11 gap-1.5 text-[13.5px] font-bold text-ink-dim md:h-9"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          {paused ? `Play ${label}` : `Pause ${label}`}
        </Button>
      </div>
    </div>
  );
}
