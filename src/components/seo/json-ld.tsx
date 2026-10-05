/**
 * Renders one JSON-LD block. `<` is escaped so a value can never close the script tag, and the
 * payload is JSON only (never user HTML). Only emit schema that matches content visible on the page.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}
