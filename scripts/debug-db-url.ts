/**
 * Print how the DB driver parses DATABASE_URL — without exposing the
 * password. Helps diagnose authentication failures.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseConn } from "pg-connection-string";

function loadDotenv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  const out: Record<string, string> = {};
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadDotenv(resolve(process.cwd(), ".env.local"));
const url = env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL in .env.local");
  process.exit(1);
}

const parsed = parseConn(url);
console.log("Parsed config:");
console.log("  user:    ", parsed.user);
console.log("  host:    ", parsed.host);
console.log("  port:    ", parsed.port);
console.log("  database:", parsed.database);
console.log(
  "  password:",
  parsed.password ? `<${(parsed.password as string).length} chars>` : "(empty)"
);
console.log(
  "  password starts with:",
  (parsed.password as string)?.slice(0, 2),
  "...ends with:",
  (parsed.password as string)?.slice(-2)
);
