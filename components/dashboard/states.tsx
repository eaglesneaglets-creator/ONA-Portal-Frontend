import { RotateCw, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Designed empty, error and loading states (docs/design/ui-v2.md §5):
 * a sentence and an action when empty, a retry when failed, skeletons
 * shaped like the content while loading.
 */

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border-default bg-surface px-6 py-12 text-center">
      <span aria-hidden="true" className="mb-4 grid size-12 place-items-center rounded-xl bg-surface-alt text-ona-blue">
        <Icon className="size-6" />
      </span>
      <p className="text-[16px] font-bold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-[14px] text-ink-dim">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-border-default bg-surface px-6 py-10 text-center">
      <p className="mb-4 text-[15px] text-ink">{message}</p>
      <Button variant="outline" onClick={onRetry} className="h-11">
        <RotateCw aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
      ))}
    </div>
  );
}
