import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * A KPI tile: label, big number, one line of context.
 *
 * `value` undefined means "still loading" and shows a skeleton; null means
 * "could not be loaded" and shows a dash. Real data only — never a
 * placeholder number (PRODUCT.md). One tile per row may be `brand`, carrying
 * the ONA gradient to mark the number that matters most; on phones it spans
 * the full width above the others, which pair up two to a row.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  brand = false,
}: {
  label: string;
  value: React.ReactNode | undefined | null;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  brand?: boolean;
}) {
  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 sm:p-5",
        brand ? "border-transparent bg-ona-gradient text-white max-sm:col-span-2" : "border-border-default bg-surface",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-[13px] font-bold", brand ? "text-white/85" : "text-ink-dim")}>{label}</p>
        {Icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "grid size-8 place-items-center rounded-md",
              brand ? "bg-white/15 text-white" : "bg-surface-alt text-ona-blue",
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      {value === undefined ? (
        <Skeleton className={cn("my-2 h-8 w-16", brand && "bg-white/25")} />
      ) : (
        <p
          className={cn("my-1.5 text-[32px] font-black leading-none tabular-nums", brand ? "text-white" : "text-ink")}
          data-testid={`stat-${label}`}
        >
          {value ?? "—"}
        </p>
      )}
      {hint ? <p className={cn("text-[12.5px]", brand ? "text-white/80" : "text-ink-mute")}>{hint}</p> : null}
    </li>
  );
}

export function StatGrid({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ul aria-label={label} className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
      {children}
    </ul>
  );
}
