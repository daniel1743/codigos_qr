import { readCanonicalPageEnvelope } from "../../lib/canonical-page/contract";
import { validateTemplate } from "../../premium-template-studio/engine/TemplateValidator";
import type { BioTemplateConfig } from "../../premium-template-studio/types";

/** Trusted verification variant, mirrored from `profiles.verification_variant`. */
export type TrustedVerificationVariant = "none" | "standard" | "official-gold";

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

/**
 * Merge the TRUSTED DB `profiles.verification_variant` into the resolved
 * render config. This is the single security choke point for official-gold:
 *
 *   - Any `verificationVariant` present in the canonical JSON is STRIPPED
 *     (it is never authority — a user-crafted canonical payload cannot
 *     self-grant official status).
 *   - Only `official-gold` / `standard` from the trusted DB value are applied.
 *   - `none` (or absent) leaves `verificationVariant` unset so the renderer
 *     falls back to the legacy `profile.verified` boolean for standard
 *     verification.
 */
export function applyTrustedVerificationVariant(
  config: BioTemplateConfig,
  trustedVariant: TrustedVerificationVariant | null | undefined,
): BioTemplateConfig {
  const effective: "standard" | "official-gold" | undefined =
    trustedVariant === "official-gold" || trustedVariant === "standard"
      ? trustedVariant
      : undefined;
  const hasCanonicalVariant = "verificationVariant" in config.profile;

  // Nothing trusted to apply and nothing canonical to strip → return unchanged
  // (preserves reference equality for the common non-verified case).
  if (!effective && !hasCanonicalVariant) return config;

  const { verificationVariant: _canonical, ...restProfile } = config.profile;
  return {
    ...config,
    profile: {
      ...restProfile,
      ...(effective ? { verificationVariant: effective } : {}),
    },
  };
}
