import type { LucideIcon } from "lucide-react";
import Link from "next/link";

/**
 * A page's main action on a phone: a labelled pill floating above the tab
 * bar, bottom-right where the thumb rests. On desktop the same action lives in
 * the header, so this renders nothing from md up.
 *
 * It also leaves a spacer at the end of the page, so the last row and the
 * pager can scroll clear of it.
 */
export function PhoneFab({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <>
      <div aria-hidden="true" className="h-16 md:hidden" />
      <Link
        href={href}
        className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-[52px] items-center gap-2 rounded-full bg-ona-red pr-5 pl-4 text-[16px] font-black text-white shadow-[0_8px_16px_rgba(23,21,31,0.18),0_2px_4px_rgba(23,21,31,0.12)] outline-none focus-visible:ring-3 focus-visible:ring-ona-blue/50 active:scale-[0.98] md:hidden"
      >
        <Icon aria-hidden="true" className="size-5" strokeWidth={2.5} />
        {label}
      </Link>
    </>
  );
}
