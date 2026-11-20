"use client";

import { useEffect, useRef } from "react";

/**
 * A short confetti burst in ONA's colours for a real milestone (a deposit
 * paid, the guide finished) — the micro-celebration every good onboarding
 * has, kept to one second and one moment. Canvas, no library; nothing at all
 * for someone who has asked their system for reduced motion.
 */
const COLOURS = ["#00108f", "#310c6d", "#64084b", "#970429", "#c90007", "#f4b400"];

export function Celebrate({ fire }: { fire: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const pieces = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: innerHeight * 0.38,
      vx: (Math.random() - 0.5) * 13,
      vy: -Math.random() * 13 - 4,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    }));
    const start = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const age = t - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of pieces) {
        p.vy += 0.32;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - age / 1800);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (age < 1800) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fire]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}
