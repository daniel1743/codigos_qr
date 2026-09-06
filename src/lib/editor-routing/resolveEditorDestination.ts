import { readCanonicalPageEnvelope } from "@/lib/canonical-page";
import { validateTemplate } from "@/premium-template-studio";

export type EditorDestination = "basic" | "power";

/** Resolve the editor from the persisted page shape, never from account metadata. */
export function resolveEditorDestination(templateConfig: unknown): EditorDestination {
  const envelope = readCanonicalPageEnvelope(templateConfig);
  if (!envelope || !validateTemplate(envelope.editorConfig).valid) return "basic";
  return "power";
}

export function buildPowerEditorHandoffUrl(profileId: string): string {
  return `/power-editor?profileId=${encodeURIComponent(profileId)}`;
}
