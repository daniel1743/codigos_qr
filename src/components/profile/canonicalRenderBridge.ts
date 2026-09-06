import { readCanonicalPageEnvelope } from "../../lib/canonical-page/contract";
import { validateTemplate } from "../../premium-template-studio/engine/TemplateValidator";
import type { BioTemplateConfig } from "../../premium-template-studio/types";

/**
 * Canonical Engine V2 pages are authoritative even when no Basic template id
 * exists. Return the stored config unchanged; invalid values stay on the
 * existing Basic/legacy path and are never persisted or repaired here.
 */
export function resolveCanonicalEditorConfig(value: unknown): BioTemplateConfig | null {
  const envelope = readCanonicalPageEnvelope(value);
  if (!envelope) return null;

  const validation = validateTemplate(envelope.editorConfig);
  return validation.valid ? envelope.editorConfig : null;
}
