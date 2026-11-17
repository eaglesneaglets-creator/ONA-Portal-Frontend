import { cn } from "@/lib/utils";
import { STATUS_LABEL, type KycStatus } from "@/lib/api/kyc";

const TONE: Record<KycStatus, string> = {
  draft: "bg-surface-sunk text-ink-dim",
  submitted: "bg-info-bg text-info",
  in_review: "bg-info-bg text-info",
  changes_requested: "bg-warn-bg text-warn",
  approved: "bg-ok-bg text-ok",
  rejected: "bg-err-bg text-err",
};

/** Status of an identity check, in words, coloured by what it means for the person. */
export function KycStatusBadge({ status, className }: { status: KycStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap",
        TONE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
