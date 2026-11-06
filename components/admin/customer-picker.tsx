"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi, type StaffCustomer } from "@/lib/api/admin";

/**
 * Find an existing customer by name, email or phone (staff only).
 * Shared by the New booking form and the Job dialog (Task 15).
 */
export function CustomerPicker({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: StaffCustomer | null;
  onChange: (c: StaffCustomer | null) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<StaffCustomer[] | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      adminApi
        .customers({ search: query.trim() })
        .then((r) => live && setMatches(r.results.slice(0, 6)))
        .catch(() => live && setMatches([]));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-ona-blue/30 bg-info-bg px-4 py-3">
        <span className="min-w-0">
          <b className="block truncate text-ink">{value.name}</b>
          <span className="block truncate text-[13px] text-ink-dim">
            {value.email}
            {value.phone ? ` · ${value.phone}` : ""}
          </span>
        </span>
        <Button type="button" variant="ghost" className="h-11 md:h-8" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  const searching = query.trim().length >= 2;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Find by name, email or phone</Label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-mute" />
        <Input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="At least two letters"
          className="h-11 pl-9 md:h-9"
          aria-invalid={Boolean(error)}
        />
      </div>
      {error ? <p className="text-[13px] text-err">{error}</p> : null}
      {searching && matches ? (
        matches.length ? (
          <ul aria-label="Matching customers" className="divide-y divide-border-soft rounded-lg border border-border-default">
            {matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onChange(c)}
                  className="flex min-h-11 w-full flex-col items-start px-4 py-2 text-left hover:bg-surface-alt"
                >
                  <span className="font-bold text-ink">{c.name}</span>
                  <span className="text-[13px] text-ink-dim">
                    {c.email}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] text-ink-mute">No customer matches.</p>
        )
      ) : null}
    </div>
  );
}
