import { cn } from "@/lib/utils";

/**
 * Progress drawn as a studio level meter — one bar per step, lit in the ONA
 * gradient as steps are done. Heights rise like a meter's ladder, so "how far
 * along" reads at a glance, and it is unmistakably this studio's, not a
 * generic progress bar.
 */
export function LevelMeter({
  done,
  total,
  label,
  className,
  size = "md",
}: {
  done: number;
  total: number;
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? 18 : 28;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${total} done`}
      className={cn("flex items-end gap-[3px]", className)}
      style={{ height: h }}
    >
      {Array.from({ length: total }, (_, i) => {
        const lit = i < done;
        const pct = 38 + (62 * (i + 1)) / total;
        return (
          <span
            key={i}
            className={cn(
              "w-[7px] rounded-[2px] transition-[background,transform] duration-500 motion-reduce:transition-none",
              lit ? "bg-ona-gradient" : "bg-border-default",
              lit && "ona-meter-lit",
            )}
            style={{ height: `${pct}%`, transitionDelay: `${i * 60}ms` }}
          />
        );
      })}
    </div>
  );
}
