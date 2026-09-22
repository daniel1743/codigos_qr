/**
 * PAGES_7 — PageGeneratorAdapter.
 *
 * RESPONSIBILITIES
 *   - map a generated-Page input to the EXISTING Engine V2 host input
 *   - forward owner-supplied structured content (never fabricate it)
 *   - hydrate/normalize only generator-produced data
 *   - validate with the EXISTING canonical `validateTemplate` before persistence
 *   - reject an invalid generation instead of persisting it
 *
 * FORBIDDEN (enforced by construction)
 *   - renderer-specific hacks, draft fallback, post-publish repair
 *   - a duplicated canonical validator
 *   - a second production renderer / schema / persistence path
 */

import {
  mapOnboardingIntentV2ToEngineInput,
  type OnboardingV2AdapterDiagnostics,
  type OnboardingV2AdapterFailureCode,
} from "@/lib/onboarding-v2/engine-v2-adapter";
import type { OnboardingIntentV2 } from "@/lib/onboarding-v2/types";
import type { EngineV2HostGenerationInput } from "@/lib/parametric-engine-v2/internal-entrypoint";
import type { ContentSourceV2 } from "@/lib/parametric-engine-v2/power-editor/content-source";
import type { GenerateV2Options } from "@/lib/parametric-engine-v2/power-editor/generate-v2";
import { acceptEngineGeneratedConfig, type CanonicalPageEnvelopeV1 } from "@/lib/canonical-page";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { buildGeneratedPageIntent } from "./intent";
import { GENERATED_PAGE_OBJECTIVE_PRESETS } from "./objective-presets";
import type { GeneratedPageInput } from "./types";
import { generatedPageItems } from "./validation";
import {
  ownerContentFromGeneratedPageInput,
  ownerContentToEngineContentBlocks,
} from "./owner-content";

export interface GeneratedPageEngineMappingSuccess {
  ok: true;
  intent: OnboardingIntentV2;
  engineInput: EngineV2HostGenerationInput;
  contentBlocks: Partial<ContentSourceV2> | undefined;
  /** Existing Engine V2 options derived from real owner media availability. */
  engineOptions: GenerateV2Options | undefined;
  diagnostics: OnboardingV2AdapterDiagnostics;
}

export interface GeneratedPageEngineMappingFailure {
  ok: false;
  code: OnboardingV2AdapterFailureCode;
  errors: string[];
  diagnostics: OnboardingV2AdapterDiagnostics;
}

export type GeneratedPageEngineMappingResult =
  GeneratedPageEngineMappingSuccess | GeneratedPageEngineMappingFailure;

export type CanonicalDocumentResult =
  { ok: true; envelope: CanonicalPageEnvelopeV1 } | { ok: false; errors: string[] };

/**
 * Owner-supplied items → the engine's existing structured-content contract.
 *
 * Every mapping uses the engine's canonical content shapes (services, products,
 * portfolio, events, contact). Nothing is invented: an item without its required
 * real data is rejected by `validateGeneratedPageInput` before this runs, so no
 * item is silently dropped here.
 */
export function buildEngineContentBlocks(
  input: GeneratedPageInput,
): Partial<ContentSourceV2> | undefined {
  return ownerContentToEngineContentBlocks(ownerContentFromGeneratedPageInput(input));
}

export interface GeneratedPageAdapterOptions {
  now?: string;
}

/**
 * Map the owner input to the existing Engine V2 host input. The semantic
 * mapping itself stays in the existing onboarding adapter — this function never
 * re-implements destination, feature or goal rules.
 */
export function mapGeneratedPageToEngineInput(
  input: GeneratedPageInput,
  options: GeneratedPageAdapterOptions = {},
): GeneratedPageEngineMappingResult {
  const intent = buildGeneratedPageIntent(input, options);
  const mapped = mapOnboardingIntentV2ToEngineInput(intent);
  if (!mapped.ok) {
    return { ok: false, code: mapped.code, errors: mapped.errors, diagnostics: mapped.diagnostics };
  }

  const diagnostics: OnboardingV2AdapterDiagnostics = {
    ...mapped.diagnostics,
    mappedFields: [...mapped.diagnostics.mappedFields],
    inferredFields: [...mapped.diagnostics.inferredFields],
    deferredFields: [...mapped.diagnostics.deferredFields],
    unsupportedFields: [...mapped.diagnostics.unsupportedFields],
    warnings: [...mapped.diagnostics.warnings],
  };

  const contentBlocks = buildEngineContentBlocks(input);
  if (contentBlocks) {
    const itemCount = Object.values(contentBlocks).reduce(
      (total, value) => total + (Array.isArray(value) ? value.length : 0),
      0,
    );
    diagnostics.mappedFields.push(`items -> engine contentBlocks (${itemCount} item(s))`);
  }

  const preset = GENERATED_PAGE_OBJECTIVE_PRESETS[input.objective];
  const cover = input.coverImageUrl?.trim() ?? "";
  const avatar = input.avatarImageUrl?.trim() ?? "";
  const engineInput: EngineV2HostGenerationInput = { ...mapped.engineInput };
  const hasOwnVisual =
    Boolean(cover || avatar) || generatedPageItems(input).some((item) => item.imageUrl);
  if (cover || avatar) {
    engineInput.userMedia = {
      ...(mapped.engineInput.userMedia ?? {}),
      ...(avatar ? { avatarUrl: avatar } : {}),
      ...(cover ? { bannerUrl: cover } : {}),
      ...(cover ? { bannerProvenance: { origin: "owner" } } : {}),
    };
  }
  if (hasOwnVisual && engineInput.cardMedia !== true) {
    engineInput.cardMedia = true;
  }
  if (cover) diagnostics.mappedFields.push("coverImageUrl -> userMedia.bannerUrl");
  if (avatar) diagnostics.mappedFields.push("avatarImageUrl -> userMedia.avatarUrl");
  if (hasOwnVisual) diagnostics.mappedFields.push("owner visual -> assets.card_media");

  /**
   * Media-led experiences (Catálogo / Portafolio) need the engine's media-led
   * composition to plan its product / portfolio blocks. When the owner supplied a
   * real cover image we select the engine's EXISTING `banner-first` media strategy
   * instead of leaving that decision to the candidate hash. No engine option,
   * block planner or renderer contract is changed, and nothing is asserted that
   * the owner did not provide.
   */
  const engineOptions: GenerateV2Options | undefined =
    preset.requiresCover && cover ? { mediaStrategy: "banner-first" } : undefined;
  if (engineOptions) diagnostics.mappedFields.push("media strategy -> banner-first (owner cover)");

  return {
    ok: true,
    intent,
    engineInput,
    contentBlocks,
    engineOptions,
    diagnostics,
  };
}

/**
 * Canonical validation boundary. It uses the EXISTING `validateTemplate` and the
 * EXISTING envelope contract — there is no second validator and no repair pass.
 * A generated document that the canonical validator rejects is never persisted.
 */
export function toCanonicalPageDocument(editorConfig: unknown): CanonicalDocumentResult {
  const validation = validateTemplate(editorConfig);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.issues
        .filter((issue) => issue.level === "error")
        .map((issue) => `${issue.path}: ${issue.message}`),
    };
  }
  return { ok: true, envelope: acceptEngineGeneratedConfig(editorConfig) };
}

export const pageGeneratorAdapter = {
  buildEngineContentBlocks,
  mapGeneratedPageToEngineInput,
  toCanonicalPageDocument,
};
