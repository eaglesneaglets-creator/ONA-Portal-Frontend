/**
 * Every package the BUILD needs must be a real dependency, not a devDependency.
 *
 * Railway's Nixpacks builder runs `npm ci` with NODE_ENV=production, which
 * omits devDependencies entirely. `next build` then compiles CSS through
 * postcss.config.mjs and dies with:
 *
 *   Error: Cannot find module '@tailwindcss/postcss'
 *
 * devDependencies means "not needed at runtime". It does not mean "not needed
 * to build" -- and a single-stage production install cannot tell the two
 * apart. Anything named by a build-time config file therefore belongs in
 * dependencies.
 *
 * `npm run lockcheck` cannot catch this: `npm ci --dry-run` reports the same
 * package count with and without NODE_ENV=production, because it validates
 * that the lock agrees with the manifest rather than what lands on disk. A
 * real production install in a clean tree is what exposed it -- 46 packages
 * against 347 -- and that is far too slow to run before every push.
 *
 * So this reads the build config and checks placement directly. Same failure,
 * in milliseconds rather than minutes.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const pkg = JSON.parse(read("package.json"));
const deps = pkg.dependencies ?? {};
const devDeps = pkg.devDependencies ?? {};

/**
 * Plugins named in postcss.config.mjs run during `next build`.
 *
 * Parsed from the file rather than hardcoded, so adding a plugin is covered
 * automatically. A hardcoded list would silently stop protecting the moment
 * someone added the next one.
 */
function postcssPlugins() {
  const source = read("postcss.config.mjs");
  const names = new Set();

  // Matches both object form ({"pkg": {}}) and array form (["pkg", {...}]).
  for (const [, name] of source.matchAll(/["']([@\w][\w./-]*)["']\s*[:,\]]/g)) {
    // Relative paths are local files, not packages.
    if (!name.startsWith(".")) names.add(name);
  }
  return [...names];
}

/**
 * Packages next.config.ts imports (withSentryConfig, for one) are loaded by
 * `next build` before anything compiles. Type-only imports are erased and
 * do not count; "next" itself is always a dependency.
 */
function nextConfigImports() {
  const source = read("next.config.ts");
  const names = new Set();
  for (const [, typeOnly, spec] of source.matchAll(/^import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gm)) {
    if (typeOnly || spec.startsWith(".") || spec.startsWith("@/") || spec.startsWith("node:")) continue;
    // "@scope/pkg/sub" -> "@scope/pkg"; "pkg/sub" -> "pkg"
    const parts = spec.split("/");
    names.add(spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]);
  }
  return [...names];
}

const required = [...new Set([...postcssPlugins(), ...nextConfigImports()])];
const misplaced = required.filter((name) => !deps[name] && devDeps[name]);
const missing = required.filter((name) => !deps[name] && !devDeps[name]);

if (misplaced.length === 0 && missing.length === 0) {
  console.log(
    `prodcheck: ${required.length} build-time package(s) correctly in dependencies` +
      ` (${required.join(", ")})`,
  );
  process.exit(0);
}

for (const name of misplaced) {
  console.error(
    `prodcheck: "${name}" is a devDependency but is required at BUILD time.\n` +
      `  postcss.config.mjs or next.config.ts loads it during \`next build\`, and Railway installs\n` +
      `  with NODE_ENV=production, which omits devDependencies.\n` +
      `  Move it to "dependencies".`,
  );
}

for (const name of missing) {
  console.error(
    `prodcheck: "${name}" is needed by postcss.config.mjs or next.config.ts but is not declared\n` +
      `  in package.json at all. The build will fail wherever it is not\n` +
      `  already present by accident.`,
  );
}

process.exit(1);
