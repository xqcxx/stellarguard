/**
 * Dependency audit script for StellarGuard frontend.
 *
 * Scans all source files for import statements and cross-checks them
 * against the declared dependencies in package.json. Reports:
 *   - Declared packages that are never imported (candidates for removal)
 *   - Packages that are imported but not declared (should be rare with TypeScript)
 *
 * Usage:
 *   node scripts/check-deps.mjs
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

// Packages that are implicitly used by the framework or config tooling
// and do not appear as direct `import` statements in src/.
const IMPLICIT_DEPS = new Set([
  "next",           // framework itself; used via next.config.js and CLI
  "react",          // used as JSX runtime, not always an explicit import
  "react-dom",      // used by Next.js internally
  "autoprefixer",   // postcss plugin configured in postcss.config.js
  "postcss",        // build-time config
  "tailwindcss",    // build-time config in tailwind.config.ts
  "typescript",     // compile-time; no runtime import
  "eslint",         // lint-time; no runtime import
  "eslint-config-next", // lint config
  "@types/node",    // type-only
  "@types/react",   // type-only
  "@types/react-dom", // type-only
  "vitest",         // test runner CLI; no src import needed
  "vite",           // build tool used by vitest; no src import needed
]);

/** Walk src directory and collect all .ts / .tsx files. */
function collectSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if ([".ts", ".tsx"].includes(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

/** Extract bare package names from import/require statements. */
function extractImportedPackages(files) {
  const packages = new Set();
  // Matches: from "pkg", require("pkg"), require('pkg')
  const importRe = /(?:from\s+|require\s*\(\s*)['"](@?[^./'"@\s][^'"]*)['"]/g;

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const [, specifier] of src.matchAll(importRe)) {
      // Normalise: @scope/pkg/sub → @scope/pkg, pkg/sub → pkg
      const name = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : specifier.split("/")[0];
      packages.add(name);
    }
  }
  return packages;
}

const declared = new Set([
  ...Object.keys(PKG.dependencies ?? {}),
  ...Object.keys(PKG.devDependencies ?? {}),
]);

const files = collectSourceFiles(SRC);
const imported = extractImportedPackages(files);

const unused = [...declared].filter(
  (p) => !imported.has(p) && !IMPLICIT_DEPS.has(p),
);
const undeclared = [...imported].filter(
  (p) => !declared.has(p) && !p.startsWith("@/") && p !== "node",
);

console.log(`\nStellarGuard frontend — dependency audit`);
console.log(`Scanned ${files.length} source files\n`);

if (unused.length === 0) {
  console.log("✓ No unused declared packages found.");
} else {
  console.warn(`⚠  Potentially unused packages (${unused.length}):`);
  unused.forEach((p) => console.warn(`   - ${p}`));
}

if (undeclared.length === 0) {
  console.log("✓ No undeclared imports found.");
} else {
  console.warn(`⚠  Imported but not declared (${undeclared.length}):`);
  undeclared.forEach((p) => console.warn(`   - ${p}`));
}
console.log("\nVersion notes (run `npm outdated` for details):");
console.log("\nVersion notes (run `npm outdated` for details):");
console.log("\nVersion notes (run `npm outdated` for details):");
console.log("  next              14.2.0   — latest major: 15.x (breaking changes; upgrade separately)");
console.log("  @stellar/stellar-sdk ^11.3.0 — latest major: 15.x (upgrade separately after API review)");
console.log("  @stellar/freighter-api ^2.0.0 — latest major: 6.x (upgrade separately after API review)");
console.log("  vitest            ^3.2.4   — latest: 4.x (minor breaking changes; upgrade when ready)");
console.log("");

const exitCode = unused.length > 0 || undeclared.length > 0 ? 1 : 0;
process.exit(exitCode);
