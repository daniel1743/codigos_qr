import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Regression guard for the C3.3-A.1-H2 runtime failure.
 *
 * `PremiumProductCardMagicToolbar.tsx` (the Magic catalog product card toolbar)
 * contained a CommonJS call inside the component body:
 *
 *     const { cardStyle } = require("../../engine/styleEngine");
 *
 * Vite serves this client-side module as native ESM, so `require` is not
 * defined in the browser and the very first render of the editing toolbar threw
 * `ReferenceError: require is not defined` (PremiumProductCardMagicToolbar.tsx:549),
 * crashing every catalog edit interaction. The same class of defect previously
 * hit `PremiumProductCardMagicV1.tsx`.
 *
 * This source-level check keeps a runtime `require()` from silently re-entering
 * the client-side Magic catalog / product-editing family. Legitimate local
 * helpers that happen to be named `require` are tolerated (a declaration is
 * required), but a bare CommonJS call is not.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const CLIENT_TREE = resolve(REPO_ROOT, "src/premium-template-studio");

/** A bare CommonJS `require(` call — excludes `foo.require(` member access. */
const RUNTIME_REQUIRE = /(^|[^.\w$])require\s*\(/;
/** A locally-declared `require` helper legitimately shadows the global. */
const LOCAL_REQUIRE = /(?:const|let|var|function)\s+require\s*[(=]/;

/** Recursively collect the SHIPPED client-side sources (tests excluded). */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("client-side Magic catalog editing family · no runtime require()", () => {
  const files = collectSourceFiles(CLIENT_TREE);

  it("scans the premium-template-studio client tree", () => {
    expect(files.length).toBeGreaterThan(50);
    // The exact component that crashed must be part of the scanned family.
    expect(
      files.map((file) => relative(REPO_ROOT, file).replace(/\\/g, "/")),
    ).toContain(
      "src/premium-template-studio/components/blocks/PremiumProductCardMagicToolbar.tsx",
    );
  });

  it("never contains a runtime CommonJS require() call", () => {
    const offenders = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      return RUNTIME_REQUIRE.test(source) && !LOCAL_REQUIRE.test(source);
    });
    expect(
      offenders.map((file) => relative(REPO_ROOT, file)),
      "browser code must use static ESM imports, never require()",
    ).toEqual([]);
  });

  it("resolves cardStyle through a static ESM import in the toolbar", () => {
    const toolbar = resolve(
      CLIENT_TREE,
      "components/blocks/PremiumProductCardMagicToolbar.tsx",
    );
    const source = readFileSync(toolbar, "utf8");
    expect(source).not.toMatch(RUNTIME_REQUIRE);
    expect(source).toMatch(
      /import\s*\{[^}]*\bcardStyle\b[^}]*\}\s*from\s*["']\.\.\/\.\.\/engine\/styleEngine["']/,
    );
  });
});
