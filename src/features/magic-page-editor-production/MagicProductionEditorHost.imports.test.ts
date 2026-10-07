import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Regression guard for the C3.3-A.1 runtime failure: the host resolver
 * referenced `pageService.getOwnedPageByPublicId()` / `pageService.getOwnPageById()`
 * without importing `pageService`. Because the unit tests inject a MOCK
 * `catalogAccess`, the resolver never executed there, so the missing import
 * only blew up at runtime (ReferenceError -> resolve() rejects ->
 * "unavailable" -> "No se pudieron cargar los productos del catálogo.").
 * A source-level check keeps that class of defect from recurring silently.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const HOST = "src/features/magic-page-editor-production/MagicProductionEditorHost.tsx";

function read(relative: string): string {
  return readFileSync(resolve(ROOT, relative), "utf8");
}

describe("MagicProductionEditorHost · catalog resolver wiring", () => {
  const source = read(HOST);

  it("imports every service identifier it dereferences (pageService must be imported)", () => {
    // `\b` before the name avoids matching it inside `magicPageService`.
    const usesPageService = /\bpageService\./.test(source);
    const importsPageService =
      /import\s*\{[^}]*\bpageService\b[^}]*\}\s*from\s*["'][^"']*page\.service["']/.test(source);
    if (usesPageService) expect(importsPageService).toBe(true);
  });

  it("resolves a linked catalog through the OWNED page lookups (public_id, then id)", () => {
    expect(source).toContain("resolveOwnedCatalogPage(");
    expect(source).toContain("pageService.getOwnedPageByPublicId(");
    expect(source).toContain("pageService.getOwnPageById(");
  });
});
