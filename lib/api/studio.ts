/**
 * Studio catalogue — types and a server-side loader.
 *
 * SERVER, NOT THE BROWSER CLIENT
 *
 * lib/api/client.ts is the browser client: it holds the access token in
 * memory and refreshes it. The catalogue is public and rendered on the
 * server (ADR-011: SEO on public pages), so it uses plain fetch with no
 * token. Keeping the two apart means a public page can never accidentally
 * depend on a session, and the server never touches the token store.
 *
 * Money arrives twice from the API — integer pesewas for arithmetic and a
 * formatted GHS string for display. Use the display string; never format
 * pesewas on the client, or the two sides drift on rounding.
 */

export interface Room {
  id: string;
  name: string;
  description: string;
  hourly_rate_pesewas: number;
  hourly_rate_display: string;
  capacity: number;
}

export interface Engineer {
  id: string;
  name: string;
  bio: string;
  specialties: string[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  base_price_pesewas: number;
  base_price_display: string;
  duration_minutes: number;
}

interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Catalogue {
  rooms: Room[];
  engineers: Engineer[];
  services: Service[];
  /** True when the API could not be reached; the page shows a calm fallback. */
  unavailable: boolean;
}

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(
  /\/+$/,
  "",
);

async function list<T>(path: string): Promise<T[]> {
  // page_size=100 is the API's max. The catalogue is a handful of rows; if
  // it ever exceeds that, this needs real pagination, not a bigger number.
  const res = await fetch(`${BASE_URL}${path}?page_size=100`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  const page = (await res.json()) as Page<T>;
  return page.results;
}

/**
 * Load the whole catalogue in parallel.
 *
 * Fails soft: a down API renders an empty catalogue with a notice, not a
 * 500. A public page that errors because the backend hiccupped is worse
 * than one that says "try again shortly" — and the build must never fail
 * because the API was unreachable at build time.
 */
export async function fetchCatalogue(): Promise<Catalogue> {
  try {
    const [rooms, engineers, services] = await Promise.all([
      list<Room>("/studio/rooms/"),
      list<Engineer>("/studio/engineers/"),
      list<Service>("/studio/services/"),
    ]);
    return { rooms, engineers, services, unavailable: false };
  } catch {
    return { rooms: [], engineers: [], services: [], unavailable: true };
  }
}

/** "60" → "1 hr", "180" → "3 hrs", "90" → "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} ${h === 1 ? "hr" : "hrs"}`);
  if (m) parts.push(`${m} min`);
  return parts.join(" ") || "0 min";
}
