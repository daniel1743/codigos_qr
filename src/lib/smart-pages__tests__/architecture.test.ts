import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = resolve(process.cwd(), "src", "lib", "smart-pages");

const FORBIDDEN_SPECIFIER = [
  /^react($|\/)/i,
  /react-dom/i,
  /supabase/i,
  /parametric-engine-v2/i,
  /onboarding-v2/i,
  /engine-v2-adapter/i,
  /retail-presentation/i,
  /intake-adapters/i,
  /ecosystem/i,
  /fixtures/i,
  /demo-media/i,
];

function files(): string[] {
  return readdirSync(DIR).filter((f) => f.endsWith(".ts"));
}

function importSpecifiers(content: string): string[] {
  const out: string[] = [];
  const re = /from\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const cap = m[1];
    if (cap) out.push(cap);
  }
  return out;
}

describe("architecture (SMART_PAGES_2)", () => {
  it("keeps the semantic core self-contained (relative, host-free imports only)", () => {
    const list = files();
    expect(list.length).toBeGreaterThanOrEqual(7);
    for (const file of list) {
      const content = readFileSync(resolve(DIR, file), "utf8");
      for (const specifier of importSpecifiers(content)) {
        expect(specifier, `${file} imports ${specifier}`).toMatch(/^\.\//);
        for (const re of FORBIDDEN_SPECIFIER) {
          expect(specifier, `${file} imports forbidden ${specifier}`).not.toMatch(re);
        }
      }
    }
  });

  it("is pure TypeScript (no .tsx in the semantic core)", () => {
    expect(files().some((f) => f.endsWith(".tsx"))).toBe(false);
  });

  it("barrel exports exactly the six semantic modules", () => {
    const index = readFileSync(resolve(DIR, "index.ts"), "utf8");
    const exported = (index.match(/export \* from "\.\/[^"]+"/g) ?? []).map((s) =>
      s.replace('export * from "./', "").replace('"', ""),
    );
    expect(exported).toEqual([
      "catalog.types",
      "smart-pages.types",
      "content-normalizer",
      "business-presets",
      "page-orchestrator",
      "sales-actions",
    ]);
  });
});
