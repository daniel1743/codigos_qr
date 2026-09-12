import type { BioTemplateConfig } from "../../premium-template-studio/types";
import { validateTemplate } from "../../premium-template-studio/engine/TemplateValidator";
import { readCanonicalPageEnvelope } from "../../lib/canonical-page";
import { createBlankPageConfig } from "./blankPageConfig";

export { createPageStorageAdapter, type PageStorageAdapterOptions } from "./pagePersistence";

/**
 * DOCUMENT TARGET — the Power Editor mounts for one of two document owners:
 *
 *   A) `profile` — the existing primary profile page (`/editor`, `/power-editor`)
 *   B) `page`    — a child page stored in `public.pages`
 *
 * Both share the exact same `BioTemplateConfig` contract; only the persistence
 * and document identity differ.
 */
export type EditorDocumentTarget =
  | { kind: "profile"; id: string }
  | { kind: "page"; id: string };

/**
 * Resolve a child page's `template_config` into a valid editable document.
 *
 * A newly created page stores `template_config = null`; in that case we build a
 * blank canonical document in memory (seeded only with the page title) — nothing
 * is written to the database until the first successful Save.
 */
export function resolvePageEditorConfig(
  templateConfig: unknown,
  title: string,
  pageType?: string,
): BioTemplateConfig {
  const envelope = readCanonicalPageEnvelope(templateConfig);
  if (envelope?.editorConfig) {
    const validation = validateTemplate(envelope.editorConfig);
    if (validation.valid) return envelope.editorConfig;
  }
  return createBlankPageConfig(title, pageType);
}

