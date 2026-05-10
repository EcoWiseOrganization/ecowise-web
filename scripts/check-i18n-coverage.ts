/**
 * EcoWise: i18n coverage checker (Phase 11)
 *
 * Greps `t("…")` and `<T k="…" />` across `src/` and confirms every key
 * exists in both `en.ts` and `vi.ts`. Prints a delta report and exits 1 if
 * anything is missing.
 *
 * Usage:
 *   npx tsx scripts/check-i18n-coverage.ts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd(), "src");
const LOCALE_FILES = {
  en: resolve(process.cwd(), "src/i18n/locales/en.ts"),
  vi: resolve(process.cwd(), "src/i18n/locales/vi.ts"),
};

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (f === "node_modules" || f === ".next") continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(f)) {
      out.push(p);
    }
  }
  return out;
}

/** Pulls keys out of `t("...")`, `t('...')`, and `<T k="..." />`. */
function extractKeys(src: string): Set<string> {
  const keys = new Set<string>();
  const patterns = [
    /\bt\(\s*['"`]([^'"`]+)['"`]/g,
    /\bk\s*=\s*['"`]([^'"`]+)['"`]/g,
    /\bT\s+k=\{?\s*['"`]([^'"`]+)['"`]/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      // Skip dynamic / interpolated
      if (m[1].includes("${")) continue;
      if (m[1].length > 200) continue;
      keys.add(m[1]);
    }
  }
  return keys;
}

function loadLocaleKeys(file: string): Set<string> {
  const src = readFileSync(file, "utf8");
  const keys = new Set<string>();
  const re = /^\s*"([^"]+)"\s*:/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) keys.add(m[1]);
  return keys;
}

function main() {
  const files = walk(ROOT);
  const used = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const k of extractKeys(src)) used.add(k);
  }

  const en = loadLocaleKeys(LOCALE_FILES.en);
  const vi = loadLocaleKeys(LOCALE_FILES.vi);

  const missingEn = Array.from(used).filter(
    (k) => !en.has(k) && !looksDynamic(k)
  );
  const missingVi = Array.from(used).filter(
    (k) => !vi.has(k) && !looksDynamic(k)
  );
  const orphanEn = Array.from(en).filter((k) => !used.has(k) && !isInterpolated(k));
  const orphanVi = Array.from(vi).filter((k) => !used.has(k) && !isInterpolated(k));

  console.log(`Used keys in source : ${used.size}`);
  console.log(`Defined in en.ts    : ${en.size}`);
  console.log(`Defined in vi.ts    : ${vi.size}`);

  if (missingEn.length === 0 && missingVi.length === 0) {
    console.log("\n✓ All used keys are defined in both en + vi.");
  } else {
    console.log("\n✗ Missing keys:");
    if (missingEn.length) {
      console.log(`  EN missing (${missingEn.length}):`);
      missingEn.sort().forEach((k) => console.log(`    - ${k}`));
    }
    if (missingVi.length) {
      console.log(`  VI missing (${missingVi.length}):`);
      missingVi.sort().forEach((k) => console.log(`    - ${k}`));
    }
  }

  if (orphanEn.length || orphanVi.length) {
    console.log("\n(info) Orphans (defined but not used in source):");
    if (orphanEn.length) console.log(`  EN orphans: ${orphanEn.length}`);
    if (orphanVi.length) console.log(`  VI orphans: ${orphanVi.length}`);
  }

  if (missingEn.length || missingVi.length) process.exit(1);
}

/** Some keys are constructed dynamically — skip them. */
function looksDynamic(k: string): boolean {
  return (
    k.includes("{{") ||
    k.includes("${") ||
    /\$\d+/.test(k) ||
    // common base prefixes used with concatenation in source
    k === "error." ||
    k === "page." ||
    k === "billing.cancel.reason." ||
    k === "billing.invoices."
  );
}

function isInterpolated(k: string): boolean {
  return k.includes("{{");
}

main();
