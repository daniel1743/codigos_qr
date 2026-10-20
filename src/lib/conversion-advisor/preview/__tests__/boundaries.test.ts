/**
 * CA-7.3A — the preview's boundaries.
 *
 * Three properties a reviewer cannot check by reading one file:
 *
 *  1. The PURE half of the preview (`view-model.ts`, `render.ts`) imports no
 *     server module, so it cannot pull a credential, a ledger or a session store
 *     into whatever bundle it ends up in. `harness.server.ts` is the only file
 *     allowed to reach the server, and it is named for it.
 *  2. The harness never touches the process-wide guard or the real environment:
 *     the isolation is a property of the SOURCE, not of a comment claiming it.
 *  3. The preview is MOUNTED NOWHERE: no route and no landing file imports it.
 *     That is what "no añadir rutas" and "sin cambios en la landing" mean as
 *     facts rather than as intentions.
 *
 * The import parser STRIPS COMMENTS FIRST. A regex over raw source matches the
 * word "import" inside a doc comment — the CA-7.2 report records that exact
 * false edge — so the parse is done on comment-free text and every assertion is
 * against an exact list, never a set of negatives.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const PREVIEW_DIR = join(HERE, "..");
const MODULE_ROOT = join(HERE, "..", "..");
const REPO_ROOT = join(HERE, "..", "..", "..", "..", "..");

const PREVIEW_FILES = ["view-model.ts", "render.ts", "harness.server.ts"] as const;
const ALL_PREVIEW_FILES = [
  ...PREVIEW_FILES,
  "__tests__/harness.test.ts",
  "__tests__/view-model.test.ts",
];

/** Removes block and line comments so an import regex cannot match prose. */
function stripComments(source: string): string {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlocks
    .split("\n")
    .map((line) => {
      const index = line.indexOf("//");
      return index === -1 ? line : line.slice(0, index);
    })
    .join("\n");
}

interface ImportEdge {
  readonly specifier: string;
  readonly typeOnly: boolean;
}

const IMPORT_RE = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g;

/** Every import statement in a file, with its specifier and whether it is type-only. */
function importsOf(source: string): readonly ImportEdge[] {
  const clean = stripComments(source);
  const edges: ImportEdge[] = [];
  for (const match of clean.matchAll(IMPORT_RE)) {
    const clause = match[2] ?? "";
    const specifier = match[3] ?? "";
    const bindings = clause
      .replace(/[{}]/g, "")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part !== "");
    // `import type …` is type-only, and so is a named clause whose EVERY binding
    // carries the `type` keyword. A default or namespace import is a value.
    const everyBindingIsType = bindings.length > 0 && bindings.every((b) => b.startsWith("type "));
    edges.push({ specifier, typeOnly: match[1] === "type " || everyBindingIsType });
  }
  return edges;
}

const read = (relativePath: string) => readFileSync(join(REPO_ROOT, relativePath), "utf8");
const readPreview = (file: string) => read(`src/lib/conversion-advisor/preview/${file}`);

/** Everything under a directory, as repo-relative `/`-separated paths. */
function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else found.push(relative(REPO_ROOT, full).split("\\").join("/"));
  }
  return found;
}

describe("CA-7.3A — the preview's pure half stays pure", () => {
  it("view-model.ts has no value import at all: it depends on nothing at runtime", () => {
    const edges = importsOf(readPreview("view-model.ts"));
    expect(edges.filter((edge) => !edge.typeOnly)).toEqual([]);
    // Its two imports are type-only, and both are named here on purpose: a new
    // one has to be added to this list, which is how it gets noticed.
    expect(edges.map((edge) => edge.specifier).sort()).toEqual(
      ["../../../features/approved-chat-landing/types/cripqer", "../integration/contract"].sort(),
    );
  });

  it("render.ts imports exactly one thing at runtime, and it is the view model", () => {
    const edges = importsOf(readPreview("render.ts"));
    const valueImports = edges.filter((edge) => !edge.typeOnly).map((edge) => edge.specifier);
    expect(valueImports).toEqual(["./view-model"]);
  });

  it("neither pure file reaches a server module, by value or by type", () => {
    for (const file of ["view-model.ts", "render.ts"]) {
      for (const edge of importsOf(readPreview(file))) {
        expect(edge.specifier).not.toContain(".server");
        expect(edge.specifier).not.toContain("guardrails");
        expect(edge.specifier).not.toContain("provider.server");
      }
    }
  });

  it("harness.server.ts is the only preview file that imports server modules", () => {
    const serverImporters = PREVIEW_FILES.filter((file) =>
      importsOf(readPreview(file)).some(
        (edge) => !edge.typeOnly && edge.specifier.includes(".server"),
      ),
    );
    expect(serverImporters).toEqual(["harness.server.ts"]);
  });
});

describe("CA-7.3A — the harness never reaches the shared guard or the real environment", () => {
  const source = stripComments(readPreview("harness.server.ts"));

  it("never calls getAdvisorGuard: the shared, process-wide guard is not used", () => {
    expect(source).not.toContain("getAdvisorGuard");
    expect(source).not.toContain("__setAdvisorGuardForTests");
  });

  it("never reads process.env: no real key can be picked up by accident", () => {
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("readAdvisorLimitsFromProcessEnv");
    expect(source).not.toContain("readAdvisorProviderConfig");
  });

  it("builds its own guard over its own ledger", () => {
    expect(source).toContain("createAdvisorGuard");
    expect(source).toContain("createInMemoryGuardrailLedger");
  });
});

describe("CA-7.3A — the preview is mounted nowhere", () => {
  /*
   * CA-11 mounts the Advisor's SURFACE on the real landing. The preview remains
   * mounted nowhere: no route and no landing file may reach the preview module.
   * The needle names the preview directory, so the mounted `ui/` import is not
   * mistaken for the isolated harness this suite protects.
   */
  const PREVIEW_MOUNT = "conversion-advisor/preview";

  it("no route imports the preview harness", () => {
    const offenders = walk(join(REPO_ROOT, "src", "routes")).filter((file) =>
      readFileSync(join(REPO_ROOT, file), "utf8").includes(PREVIEW_MOUNT),
    );
    expect(offenders).toEqual([]);
  });

  it("no landing file imports the preview harness", () => {
    const landing = join(REPO_ROOT, "src", "features", "approved-chat-landing");
    const offenders = walk(landing).filter((file) =>
      readFileSync(join(REPO_ROOT, file), "utf8").includes(PREVIEW_MOUNT),
    );
    expect(offenders).toEqual([]);
  });

  it("the preview ships no route file of its own", () => {
    const previewTree = walk(PREVIEW_DIR).map((path) => path.split("/").pop() ?? "");
    expect(previewTree.some((name) => name.endsWith(".tsx"))).toBe(false);
  });
});

describe("CA-7.3A — every preview import stays inside the module", () => {
  it("no relative import escapes the module except the landing's TYPE file", () => {
    // Asserted on where the specifier LANDS, not on how many `..` it spells, so
    // a test file one level deeper is not a special case.
    const landingTypes = resolve(REPO_ROOT, "src/features/approved-chat-landing/types/cripqer");
    for (const file of ALL_PREVIEW_FILES) {
      for (const edge of importsOf(readPreview(file))) {
        if (!edge.specifier.startsWith(".")) continue;
        const landed = resolve(dirname(join(PREVIEW_DIR, file)), edge.specifier);
        if (landed.startsWith(MODULE_ROOT)) continue;
        // The single permitted exception, and only as a type.
        expect(landed).toBe(landingTypes);
        expect(edge.typeOnly).toBe(true);
      }
    }
  });

  it("the only bare specifiers are the test runner and Node built-ins", () => {
    const allowedBare = ["vitest", "node:crypto", "node:fs", "node:path", "node:url"];
    for (const file of ALL_PREVIEW_FILES) {
      for (const edge of importsOf(readPreview(file))) {
        if (edge.specifier.startsWith(".")) continue;
        expect(allowedBare).toContain(edge.specifier);
      }
    }
  });

  it("the landing is read as TYPES only: no component, no hook, no runtime surface", () => {
    const landingEdges = PREVIEW_FILES.flatMap((file) =>
      importsOf(readPreview(file))
        .filter((edge) => edge.specifier.includes("approved-chat-landing"))
        .map((edge) => ({ file, ...edge })),
    );
    expect(landingEdges.length).toBeGreaterThan(0);
    for (const edge of landingEdges) {
      expect(edge.specifier).toBe("../../../features/approved-chat-landing/types/cripqer");
      expect(edge.typeOnly).toBe(true);
    }
  });
});
