import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const read = (file: string): string => readFileSync(resolve(here, "..", file), "utf8");

const ROUTES = ["pg.$publicId.tsx", "pg.a.$slug.tsx"];

/** Extracts the JSX element that renders the Magic document. */
function magicRendererElement(source: string): string {
  const start = source.indexOf("<MagicPublicRenderer");
  const end = source.indexOf("/>", start);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

/**
 * The Magic analytics bug was a MISSING PROP, not a missing writer: the routes
 * rendered the Magic document without handing the host callback down. These
 * assertions pin BOTH halves for both public identities (`/pg/$publicId` and
 * `/pg/a/$slug`):
 *   - the callback IS wired when canonical analytics is enabled for the page
 *     (the controlled canary), and
 *   - the callback is NOT wired for non-allowlisted Magic pages, which must keep
 *     their previous behaviour (no click tracking during the rollout).
 */
describe("Magic public analytics wiring (strict canary scope)", () => {
  it.each(ROUTES)("%s gates onTrack on the canonical feature gate", (file) => {
    const element = magicRendererElement(read(file));
    expect(element).not.toBe("");
    expect(element).toContain("document={magicDocument}");
    expect(element).toContain("onTrack={useCanonical ? handleTrack : undefined}");
  });

  it.each(ROUTES)("%s never passes an ungated handleTrack to MagicPublicRenderer", (file) => {
    const element = magicRendererElement(read(file));
    expect(element).not.toContain("onTrack={handleTrack}");
  });

  it.each(ROUTES)("%s resolves Magic click intents through the canonical resolver", (file) => {
    const source = read(file);
    expect(source).toContain("resolveCanonicalClickType(event.type, event.url)");
  });

  it.each(ROUTES)("%s still routes Magic documents through the Magic renderer", (file) => {
    const source = read(file);
    expect(source).toContain("magicDocument ? (");
  });
});
