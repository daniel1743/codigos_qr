import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../..");

function read(relative: string): string {
  return readFileSync(resolve(ROOT, relative), "utf8");
}

describe("CRIPQER custom public link UI relocation (QR area)", () => {
  it("Power Editor no longer imports or renders CustomPublicLinkControl", () => {
    const host = read("src/components/power-editor/PowerEditorHost.tsx");
    expect(host).not.toContain("CustomPublicLinkControl");
    expect(host).not.toContain("Enlace de tu página");
  });

  it("the QR area imports and renders CustomPublicLinkControl", () => {
    const qr = read("src/routes/qr.tsx");
    expect(qr).toContain("CustomPublicLinkControl");
    expect(qr).toContain("getAliasProfileUrl");
  });

  it("the control was relocated out of power-editor into qr (no duplicate source)", () => {
    expect(existsSync(resolve(ROOT, "src/components/power-editor/CustomPublicLinkControl.tsx"))).toBe(false);
    expect(existsSync(resolve(ROOT, "src/components/qr/CustomPublicLinkControl.tsx"))).toBe(true);
  });

  it("keeps per-page slug authority in the Pages Hub for child pages", () => {
    const pageDetail = read("src/routes/pages.$pageId.tsx");
    expect(pageDetail).toContain("PageAliasSection");
    expect(pageDetail).toContain("pageAliasService");
    expect(pageDetail).toContain("savePageAlias");
  });
});
