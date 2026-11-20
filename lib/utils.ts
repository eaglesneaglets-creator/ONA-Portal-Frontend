export { cn } from "cn"

/** A copy of `obj` without `key` — e.g. clearing one field's error. */
export function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const next = { ...obj };
  delete next[key];
  return next;
}
