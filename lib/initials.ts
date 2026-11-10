/** "Ama Mensah" → "AM"; an email-only account takes its first two parts. */
export function initials(name: string): string {
  return (
    name
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "·"
  );
}
