"use client";

import { Check, ChevronDown, Clock3, MoreHorizontal } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LevelMeter } from "@/components/journey/level-meter";
import { cn } from "@/lib/utils";

/**
 * A setup guide — Shopify's pattern, in ONA's voice. Every step is listed;
 * the next one is open on a tinted panel with the single action that moves it
 * on and a picture beside it; done steps tick off and can still be reopened.
 * The whole guide collapses to its header, and can be hidden from its menu.
 *
 * Shared by the customer's "Get started" and the staff "Launch ONA" guides.
 */
export interface GuideItem {
  key: string;
  title: string;
  body: React.ReactNode;
  done: boolean;
  /** Staff guide: the section a step belongs to ("Payments"). */
  group?: string;
  urgent?: boolean;
  /** "warn" items are optional: they count as done for progress but show amber. */
  tone?: "warn";
  action?: React.ReactNode;
  illustration?: React.ReactNode;
}

export function SetupGuide({
  eyebrow,
  title,
  subtitle,
  items,
  openKey,
  onHide,
  hideLabel = "Hide this guide",
  done,
  testId,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  items: GuideItem[];
  /** Which step starts open: the next one to do. */
  openKey?: string | null;
  onHide?: () => void;
  hideLabel?: string;
  /** Shown instead of the steps once everything is done. */
  done?: React.ReactNode;
  testId?: string;
}) {
  const first = openKey ?? items.find((i) => !i.done)?.key ?? null;
  const [open, setOpen] = useState<string | null>(first);
  const [collapsed, setCollapsed] = useState(false);
  const count = items.filter((i) => i.done).length;
  const listId = useId();
  const groups = [...new Set(items.map((i) => i.group ?? ""))];

  return (
    <Card className="mb-6 gap-0 overflow-hidden py-0" data-testid={testId} data-tour={testId}>
      <div className="bg-ona-wash relative border-b border-border-soft px-5 py-5 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ona-red">{eyebrow}</p>
            <h2 className="mt-0.5 text-[clamp(20px,2.4vw,24px)] font-black leading-tight tracking-tight text-ink text-balance">{title}</h2>
            <p className="mt-1 max-w-[62ch] text-[14.5px] text-ink-dim">{subtitle}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-border-default bg-surface px-3 py-1 text-[13px] font-bold tabular-nums text-ink" data-testid={testId ? `${testId}-count` : undefined}>
                {count} / {items.length} completed
              </span>
              <LevelMeter done={count} total={items.length} label={`${eyebrow}: ${count} of ${items.length} done`} />
            </div>
          </div>
          <div className="flex flex-none items-center gap-1">
            {onHide ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-11 md:size-9" aria-label="Guide options">
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={onHide}>
                    {hideLabel}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="size-11 md:size-9"
              aria-expanded={!collapsed}
              aria-controls={listId}
              aria-label={collapsed ? "Show the steps" : "Collapse the guide"}
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronDown aria-hidden="true" className={cn("transition-transform motion-reduce:transition-none", collapsed && "-rotate-90")} />
            </Button>
          </div>
        </div>
      </div>

      <div id={listId} hidden={collapsed} className="px-2 py-2 sm:px-3">
        {done ?? (
          <div className="grid gap-1">
            {groups.map((g) => (
              <div key={g || "all"}>
                {g ? <p className="px-3 pb-1 pt-3 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-mute">{g}</p> : null}
                <ol className="grid gap-1">
                  {items
                    .filter((i) => (i.group ?? "") === g)
                    .map((item) => (
                      <Step key={item.key} item={item} open={open === item.key} onToggle={() => setOpen(open === item.key ? null : item.key)} />
                    ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function Step({ item, open, onToggle }: { item: GuideItem; open: boolean; onToggle: () => void }) {
  const panelId = useId();
  return (
    <li data-testid={`guide-step-${item.key}`} data-done={item.done || undefined} className={cn("rounded-xl transition-colors", open && "bg-surface-alt")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ona-blue"
      >
        <StatusRing done={item.done} tone={item.tone} urgent={item.urgent && !item.done} />
        <span className={cn("flex-1 text-[15px] font-bold", item.done && item.tone !== "warn" ? "text-ink-mute" : "text-ink")}>
          {item.title}
          <span className="sr-only">{item.done ? (item.tone === "warn" ? " — optional" : " — done") : " — to do"}</span>
        </span>
        {item.urgent && !item.done ? (
          <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11.5px] font-bold text-warn">Time-sensitive</span>
        ) : null}
        <ChevronDown aria-hidden="true" className={cn("size-4 flex-none text-ink-mute transition-transform motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      {open ? (
        <div id={panelId} className="flex flex-col-reverse gap-4 px-3 pb-4 pl-[52px] sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="max-w-[60ch] text-[14.5px] leading-relaxed text-ink-dim">
              {item.urgent && !item.done ? <Clock3 aria-hidden="true" className="mr-1 inline size-4 -translate-y-px text-warn" /> : null}
              {item.body}
            </div>
            {item.action ? <div className="mt-3">{item.action}</div> : null}
          </div>
          {item.illustration ? <div className="hidden sm:block">{item.illustration}</div> : null}
        </div>
      ) : null}
    </li>
  );
}

function StatusRing({ done, tone, urgent }: { done: boolean; tone?: "warn"; urgent?: boolean }) {
  if (done && tone === "warn") {
    return <span aria-hidden="true" className="grid size-7 flex-none place-items-center rounded-full bg-warn-bg text-[13px] font-black text-warn">!</span>;
  }
  if (done) {
    return (
      <span aria-hidden="true" className="ona-pop grid size-7 flex-none place-items-center rounded-full bg-ok text-white">
        <Check className="size-4" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("size-7 flex-none rounded-full border-2 border-dashed", urgent ? "border-warn" : "border-ink-mute/50")}
    />
  );
}
