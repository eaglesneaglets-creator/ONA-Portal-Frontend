import { useEffect, useState } from "react";

import { adminApi, type Professional } from "@/lib/api/admin";

/**
 * The active professionals, for the "who works this session or job" pickers.
 * Empty while loading and if they cannot be loaded: the picker then offers
 * only "None", and the rest of the form still works.
 */
export function useActiveProfessionals(): Professional[] {
  const [pros, setPros] = useState<Professional[]>([]);
  useEffect(() => {
    let live = true;
    adminApi
      .professionals({ is_active: true, page_size: 100 })
      .then((p) => live && setPros(p.results))
      .catch(() => live && setPros([]));
    return () => {
      live = false;
    };
  }, []);
  return pros;
}
