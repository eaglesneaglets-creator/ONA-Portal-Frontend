"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Search box that reports its value once typing pauses, so a list is not
 * re-fetched on every keystroke.
 */
export function SearchBox({
  label,
  placeholder,
  initial = "",
  onSearch,
}: {
  label: string;
  placeholder: string;
  initial?: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const t = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value, onSearch]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-mute" />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-11 bg-surface pl-9 md:h-9"
      />
    </div>
  );
}

/** "21–40 of 57" with previous / next. Hidden when everything fits on one page. */
export function Pager({
  page,
  pageSize,
  count,
  onPage,
}: {
  page: number;
  pageSize: number;
  count: number;
  onPage: (page: number) => void;
}) {
  if (count <= pageSize) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, count);
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-[13.5px] text-ink-dim">
      <span>
        {first}–{last} of {count}
      </span>
      <span className="flex gap-2">
        <Button variant="outline" className="h-11 md:h-8" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft aria-hidden="true" />
          Previous
        </Button>
        <Button variant="outline" className="h-11 md:h-8" disabled={last >= count} onClick={() => onPage(page + 1)}>
          Next
          <ChevronRight aria-hidden="true" />
        </Button>
      </span>
    </nav>
  );
}
