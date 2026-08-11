/** Validate the attacker-controlled `next` query parameter after login. */
export function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;

  // URL parsers treat backslashes as path separators for special schemes;
  // `/\\evil.example` can therefore become a cross-origin navigation.
  if (value.includes("\\")) return null;

  const base = new URL("https://ona.invalid");
  const target = new URL(value, base);
  if (target.origin !== base.origin) return null;

  return `${target.pathname}${target.search}${target.hash}`;
}
