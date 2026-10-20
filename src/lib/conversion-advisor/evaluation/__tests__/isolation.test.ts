/**
 * CA-9A — the harness's isolation, as a property of the SOURCE.
 *
 * Three facts a reviewer cannot check by reading one file, each asserted against
 * an exact list rather than a set of negatives:
 *
 *  1. Every non-`.server.ts` file in the evaluation module imports NO server
 *     module, by value. The pure half (the dataset, the scorer, the detector, the
 *     memory evaluator, the cost model, the stop conditions, the action-safety
 *     evaluator) therefore cannot pull a credential, a ledger, a session store or
 *     a real provider into whatever bundle it lands in.
 *  2. Only the two named `.server.ts` files reach the server, and they are named
 *     for it. That is the seam CA-9B swaps.
 *  3. The harness is MOUNTED NOWHERE: no route, no landing file, no client entry
 *     imports the evaluation module. "No añadir rutas productivas" and "no montar
 *     en la landing" hold as facts.
 *
 * The import parser STRIPS COMMENTS FIRST, because a regex over raw source
 * matches the word "import" inside a doc comment — a false edge this project has
 * already recorded once. Every assertion is on where a specifier LANDS, not on
 * how many `..` it happens to spell.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVALUATION_DIR = join(HERE, "..");
const MODULE_ROOT = join(HERE, "..", "..");
const REPO_ROOT = join(HERE, "..", "..", "..", "..", "..");

/** The evaluation module's own source files (no tests, no fixtures). */
const SOURCE_FILES = readdirSync(EVALUATION_DIR)
  .filter((name) => name.endsWith(".ts"))
  .sort();
const SERVER_FILES = ["mock-transport.server.ts", "runner.server.ts"] as const;
const PURE_FILES = SOURCE_FILES.filter(
  (name) => !(SERVER_FILES as readonly string[]).includes(name),
);

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
    const everyBindingIsType = bindings.length > 0 && bindings.every((b) => b.startsWith("type "));
    edges.push({ specifier, typeOnly: match[1] === "type " || everyBindingIsType });
  }
  return edges;
}

const readEvaluation = (file: string) =>
  readFileSync(join(EVALUATION_DIR, file), "utf8");
const resolveFrom = (file: string, specifier: string) =>
  resolve(dirname(join(EVALUATION_DIR, file)), specifier);

/** Every file under a directory, as repo-relative `/`-separated paths. */
function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else found.push(relative(REPO_ROOT, full).split("\\").join("/"));
  }
  return found;
}

describe("CA-9A isolation — the pure half stays pure", () => {
  it("names the two server files and no others", () => {
    expect(SOURCE_FILES.filter((name) => name.endsWith(".server.ts"))).toEqual([...SERVER_FILES].sort());
    expect(PURE_FILES.length).toBe(SOURCE_FILES.length - SERVER_FILES.length);
  });

  it("no pure file imports a server module by value", () => {
    for (const file of PURE_FILES) {
      for (const edge of importsOf(readEvaluation(file))) {
        if (!edge.specifier.startsWith(".")) continue;
        const landed = resolveFrom(file, edge.specifier);
        if (edge.typeOnly) continue;
        expect(landed).not.toContain(".server");
      }
    }
  });

  it("no pure file imports the provider, the guard or the session store", () => {
    // `guardrails/limits` is PURE (no imports of its own) and is the one
    // `guardrails` path a pure file may read; the guard and the ledger are the
    // server modules, and they are named exactly.
    const banned = [
      "provider.server",
      "guardrails/guard.server",
      "guardrails/ledger.server",
      "session/store.server",
      "turn.server",
    ];
    for (const file of PURE_FILES) {
      for (const edge of importsOf(readEvaluation(file))) {
        for (const needle of banned) expect(edge.specifier).not.toContain(needle);
      }
    }
  });

  it("only the server files import a `.server` module, and only by value in the runner", () => {
    // Any `.server` specifier — even a type-only one — may appear only in the two
    // named server files. `mock-transport.server.ts` reaches the provider's
    // TYPES; `runner.server.ts` reaches the pipeline's VALUES.
    const withServerImport = SOURCE_FILES.filter((file) =>
      importsOf(readEvaluation(file)).some((edge) => edge.specifier.includes(".server")),
    );
    expect(withServerImport).toEqual([...SERVER_FILES].sort());

    const withValueServerImport = SOURCE_FILES.filter((file) =>
      importsOf(readEvaluation(file)).some(
        (edge) => !edge.typeOnly && edge.specifier.includes(".server"),
      ),
    );
    for (const file of withValueServerImport) expect(SERVER_FILES).toContain(file);
    expect(withValueServerImport).toContain("runner.server.ts");
  });

  it("keeps every relative import inside the conversion-advisor module", () => {
    for (const file of SOURCE_FILES) {
      for (const edge of importsOf(readEvaluation(file))) {
        if (!edge.specifier.startsWith(".")) continue;
        expect(resolveFrom(file, edge.specifier).startsWith(MODULE_ROOT)).toBe(true);
      }
    }
  });

  it("uses only the test runner and Node built-ins as bare specifiers", () => {
    const allowedBare = ["vitest", "node:crypto", "node:fs", "node:path", "node:os"];
    for (const file of SOURCE_FILES) {
      for (const edge of importsOf(readEvaluation(file))) {
        if (edge.specifier.startsWith(".")) continue;
        expect(allowedBare).toContain(edge.specifier);
      }
    }
  });
});

describe("CA-9A isolation — the harness is mounted nowhere", () => {
  /*
   * CA-11 mounts the Advisor's SURFACE on the real landing. This suite is about
   * the EVALUATION harness, not the surface: the paid runner, its dataset and
   * its server transports must still be reachable from no route and no landing
   * file. The needle is therefore the evaluation directory itself — a mounted
   * `ui/` import is not an evaluation import.
   */
  const EVALUATION_MOUNT = "conversion-advisor/evaluation";

  it("no route imports the evaluation harness", () => {
    const offenders = walk(join(REPO_ROOT, "src", "routes")).filter((file) =>
      readFileSync(join(REPO_ROOT, file), "utf8").includes(EVALUATION_MOUNT),
    );
    expect(offenders).toEqual([]);
  });

  it("no landing file imports the evaluation harness", () => {
    const landing = join(REPO_ROOT, "src", "features", "approved-chat-landing");
    const offenders = walk(landing).filter((file) =>
      readFileSync(join(REPO_ROOT, file), "utf8").includes(EVALUATION_MOUNT),
    );
    expect(offenders).toEqual([]);
  });

  it("the evaluation module ships no route or component file of its own", () => {
    const names = walk(EVALUATION_DIR).map((path) => path.split("/").pop() ?? "");
    expect(names.some((name) => name.endsWith(".tsx"))).toBe(false);
    expect(names.some((name) => /(^|\/)route\./.test(name))).toBe(false);
  });
});
