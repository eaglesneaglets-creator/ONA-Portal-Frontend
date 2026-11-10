"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads something and keeps it: `undefined` while the first answer is on its
 * way, `null` when it failed, otherwise the data. `filters` is what the load
 * depends on; when any of them changes (or `refresh` is called) it loads
 * again, and an answer that arrives after the page has moved on is dropped.
 */
export function useLoaded<T>(load: () => Promise<T>, filters: readonly unknown[]) {
  const [data, setData] = useState<T | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  // The latest `load` without making callers memoise it.
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  });

  const key = JSON.stringify(filters);
  useEffect(() => {
    let live = true;
    loader
      .current()
      .then((d) => live && setData(d))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [key, reload]);

  return { data, refresh };
}

/**
 * A searchable, paged list for the staff console: the search box and pager
 * state, plus the load. A new search goes back to page 1.
 */
export function usePagedList<T>(
  load: (query: { search: string | undefined; page: number }) => Promise<T>,
  filters: readonly unknown[] = [],
) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, refresh } = useLoaded(() => load({ search: search || undefined, page }), [...filters, search, page]);

  const onSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  return { data, search, page, setPage, onSearch, refresh };
}
