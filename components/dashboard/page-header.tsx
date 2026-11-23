import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/**
 * The top of every dashboard page: one <h1>, one line of context, and the
 * page's own actions on the right (they wrap under the title on phones).
 *
 * `back` is a phone-only "‹ Bookings" link above the title. A phone has no
 * top bar or breadcrumb, so a page reached from another (a form, a detail
 * page) needs its own way back; desktop pages keep their header buttons.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 max-md:mb-4 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="-mt-2 -ml-2 mb-1 inline-flex min-h-11 items-center gap-0.5 rounded-lg pr-2 text-[15px] font-bold text-info md:hidden"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
            {back.label}
          </Link>
        ) : null}
        <h1 className="text-[clamp(24px,3.4vw,30px)] font-black leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {description ? <p className="mt-1 text-[14.5px] text-ink-dim">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
