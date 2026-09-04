/**
 * Host-owned persistence boundary for the future Power Editor configuration.
 *
 * `editorConfig` is deliberately opaque here. The Power Editor package owns
 * its internal BioTemplateConfig contract; the host only versions, validates
 * and persists the envelope around it.
 */

import type { BioTemplateConfig } from "@/premium-template-studio/types";

export const CRIPQER_CANONICAL_PAGE_SCHEMA_VERSION = 1 as const;

export type CanonicalEditorConfigV1 = BioTemplateConfig;

export interface CanonicalPageEnvelopeV1<
  TEditorConfig extends CanonicalEditorConfigV1 = CanonicalEditorConfigV1,
> {
  readonly schemaVersion: typeof CRIPQER_CANONICAL_PAGE_SCHEMA_VERSION;
  readonly editorConfig: TEditorConfig;
}

export interface CanonicalPageValidationV1 {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface CripqerOnboardingIntentV1 {
  readonly profession: string;
  readonly goal: string;
  readonly style?: string;
  readonly selectedFeatures: readonly string[];
  readonly preferredColor?: string;
  readonly media?: {
    readonly avatarUrl?: string;
    readonly bannerUrl?: string;
  };
  readonly content?: {
    readonly name?: string;
    readonly bio?: string;
    readonly links?: readonly { label: string; url: string }[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateCanonicalPageEnvelope(value: unknown): CanonicalPageValidationV1 {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["Canonical page envelope must be an object."] };
  }

  if (value["schemaVersion"] !== CRIPQER_CANONICAL_PAGE_SCHEMA_VERSION) {
    errors.push(`Unsupported canonical page schemaVersion: ${String(value["schemaVersion"])}.`);
  }

  if (!isRecord(value["editorConfig"])) {
    errors.push("Canonical page editorConfig must be an object.");
  }

  return { valid: errors.length === 0, errors };
}

export function createCanonicalPageEnvelope(editorConfig: unknown): CanonicalPageEnvelopeV1 {
  const envelope = {
    schemaVersion: CRIPQER_CANONICAL_PAGE_SCHEMA_VERSION,
    editorConfig,
  };
  const validation = validateCanonicalPageEnvelope(envelope);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }
  return envelope as CanonicalPageEnvelopeV1;
}

/** Return a canonical envelope, or null for a legacy Basic-only JSON value. */
export function readCanonicalPageEnvelope(value: unknown): CanonicalPageEnvelopeV1 | null {
  const validation = validateCanonicalPageEnvelope(value);
  return validation.valid ? (value as CanonicalPageEnvelopeV1) : null;
}

/**
 * Engine V2 integration seam. It validates the host envelope without
 * importing Engine or Power Editor code into the current Basic Editor.
 */
export function acceptEngineGeneratedConfig(editorConfig: unknown): CanonicalPageEnvelopeV1 {
  return createCanonicalPageEnvelope(editorConfig);
}
