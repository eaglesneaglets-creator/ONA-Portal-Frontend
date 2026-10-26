/**
 * Reading a GHS amount a person typed — "150", "150.5", "1,250.00" — into
 * integer pesewas.
 *
 * Done on the string, never with floating point: parseFloat("0.29") * 100 is
 * 28.999999999999996, and a fee that rounds the wrong way is a real cedi
 * someone notices. Returns null for anything that is not a plain amount with
 * at most two decimal places. Display formatting stays with the server's
 * `_display` strings; this is input only.
 */
export function parseGhsToPesewas(input: string): number | null {
  const s = input.trim().replace(/^GHS\s*/i, "");
  // Commas only as thousands separators ("1,250.00"). "1,50" is ambiguous —
  // a decimal comma would mean 1.50, stripping it means 150 — so it is
  // refused rather than guessed (QA F8).
  if (s.includes(",") && !/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) return null;
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(s.replace(/,/g, ""));
  if (!m) return null;
  const cedis = Number(m[1]);
  const pesewas = Number((m[2] ?? "").padEnd(2, "0"));
  return cedis * 100 + pesewas;
}

/** 15000 → "150.00" — for pre-filling an input, not for display. */
export function pesewasToInput(pesewas: number): string {
  const whole = Math.floor(pesewas / 100);
  const part = pesewas % 100;
  return `${whole}.${String(part).padStart(2, "0")}`;
}
