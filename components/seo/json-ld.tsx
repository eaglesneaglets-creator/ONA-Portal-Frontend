/**
 * Structured data (schema.org JSON-LD) for search engines: who ONA is, what
 * it sells and the answers on /faqs. Only real values go in; a field that is
 * empty in the console is left out rather than guessed.
 *
 * `<` is escaped so a value can never close the tag (Next's JSON-LD guide).
 * The CSP does not apply: browsers never execute an application/ld+json block.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
