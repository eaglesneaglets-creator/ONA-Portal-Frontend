/**
 * Guards for two things every page needs and nothing else would catch.
 *
 * 1. Its own tab title (WCAG 2.4.2). A "use client" page cannot export
 *    `metadata`, and without one it silently shows the root default,
 *    "ONA Records" — 28 of 35 pages did before 2026-11-20. Each page sets a
 *    title itself (server page) or in a layout.tsx beside it (client page).
 *
 * 2. A target for the skip link in the root layout. The link points at
 *    #main-content, so every <main> carries that id (WCAG 2.4.1).
 *
 * These read the source rather than rendering: pages need a router, auth
 * and the API to render, and the rule is about what the file declares.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".") || name === "__tests__") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx$/.test(name)) out.push(path);
  }
  return out;
}

const read = (path: string) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
};

const declaresTitle = (source: string) =>
  /export\s+async\s+function\s+generateMetadata/.test(source) ||
  // `= { title: … }`, or through a helper: `= publicPage({ title: … })`.
  /export\s+const\s+metadata[^=]*=\s*(?:\w+\()?\{[\s\S]*?\btitle\s*:/.test(source);

describe("every page has its own tab title", () => {
  const files = walk(join(ROOT, "app"));
  const pages = files.filter((p) => p.endsWith("page.tsx"));
  const name = (p: string) => relative(ROOT, p).replaceAll("\\", "/");

  it.each(pages.map((p) => [name(p), p]))("%s", (_name, page) => {
    const dir = join(page, "..");
    const titled = declaresTitle(read(page)) || declaresTitle(read(join(dir, "layout.tsx")));
    expect(titled, "export metadata.title from the page, or from a layout.tsx beside it").toBe(true);
  });

  // A plain-string title in a layout resets the root's "%s — ONA Records"
  // template for every page below it (/admin/bookings once read "Bookings").
  const sections = files.filter(
    (f) => f.endsWith("layout.tsx") && name(f) !== "app/layout.tsx" && declaresTitle(read(f)) &&
      pages.some((p) => p.startsWith(join(f, "..") + sep) && join(p, "..") !== join(f, "..")),
  );
  it.each(sections.map((f) => [name(f), f]))("%s keeps the site suffix for the pages below it", (_name, layout) => {
    expect(read(layout)).toMatch(/sectionTitle\(/);
  });

  it("no two pages share a title", () => {
    const titles = files
      .filter((f) => /(page|layout)\.tsx$/.test(f) && name(f) !== "app/layout.tsx")
      .flatMap((f) => [...read(f).matchAll(/title:\s*(?:sectionTitle\()?"([^"]+)"/g)].map((m) => m[1]));
    const repeated = titles.filter((t, i) => titles.indexOf(t) !== i);
    expect(repeated).toEqual([]);
  });
});

describe("the skip link has somewhere to land", () => {
  // Comments mention "<main>" too; only real elements count.
  const code = (path: string) =>
    read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const files = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))];
  const withMain = files.filter((f) => /<main[\s>]/.test(code(f)));

  it("finds the <main> elements", () => {
    expect(withMain.length).toBeGreaterThan(5);
  });

  it.each(withMain.map((f) => [relative(ROOT, f).replaceAll("\\", "/"), f]))("%s", (_name, file) => {
    const mains = code(file).match(/<main[\s>][^>]*>/g) ?? [];
    for (const tag of mains) expect(tag).toMatch(/id="main-content"/);
  });
});
