// Vitest global setup. Loads env hooks and silences known noisy warnings.
import { vi } from "vitest";

// Quiet down expected console.error from audit failure paths during tests.
const origError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? "");
  if (msg.includes("[audit.service] writeAuditLog failed")) return;
  if (msg.includes("[audit.service] writeAuditLog threw")) return;
  origError(...(args as Parameters<typeof console.error>));
};

// next/headers is server-only — provide a default no-op for unit tests
// (integration tests stub per-test).
vi.mock("next/headers", () => ({
  headers: async () => new Map<string, string>(),
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}));
