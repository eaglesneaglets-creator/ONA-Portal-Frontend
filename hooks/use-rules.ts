"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api/client";
import { DEFAULT_RULES, type PublicRules } from "@/lib/api/business";

let cached: Promise<PublicRules> | null = null;

/** In the browser: the rules, fetched once per page load and shared. Defaults until they arrive. */
export function useRules(): PublicRules {
  const [rules, setRules] = useState<PublicRules>(DEFAULT_RULES);
  useEffect(() => {
    let live = true;
    cached ??= api.get<PublicRules>("/content/rules/").then(
      (r) => ({ ...DEFAULT_RULES, ...r }),
      () => {
        cached = null; // try again next time
        return DEFAULT_RULES;
      },
    );
    cached.then((r) => live && setRules(r));
    return () => {
      live = false;
    };
  }, []);
  return rules;
}
