import {
  generateCripqerPageWithEngineV2,
  type EngineV2HostGenerationInput,
  type EngineV2HostGenerationOptions,
} from "@/lib/parametric-engine-v2/internal-entrypoint";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import type { OnboardingIntentV2 } from "./types";
import {
  mapOnboardingIntentV2ToEngineInput,
  type OnboardingV2AdapterDiagnostics,
} from "./engine-v2-adapter";

export interface OnboardingV2GenerationSuccess {
  status: "GENERATED";
  onboardingIntent: OnboardingIntentV2;
  engineInput: EngineV2HostGenerationInput;
  editorConfig: ReturnType<typeof generateCripqerPageWithEngineV2>["editorConfig"];
  canonicalEnvelopePreview: ReturnType<typeof generateCripqerPageWithEngineV2>["canonicalEnvelope"];
  generationMetadata: ReturnType<typeof generateCripqerPageWithEngineV2>["generation"];
  diagnostics: OnboardingV2AdapterDiagnostics;
}

export interface OnboardingV2GenerationFailure {
  status:
    | "INVALID_INPUT"
    | "INVALID_DESTINATION"
    | "NEEDS_INPUT"
    | "BLOCKED"
    | "GENERATION_FAILED"
    | "INVALID_ENGINE_OUTPUT";
  onboardingIntent: OnboardingIntentV2;
  diagnostics: OnboardingV2AdapterDiagnostics;
  errors: string[];
}

export type OnboardingV2GenerationResult =
  OnboardingV2GenerationSuccess | OnboardingV2GenerationFailure;

/**
 * Internal semantic QA wrapper. It returns only in-memory generation output;
 * it has no persistence, publication or Supabase call.
 */
export function generateFromOnboardingIntentV2(
  onboardingIntent: OnboardingIntentV2,
  options: EngineV2HostGenerationOptions = {},
): OnboardingV2GenerationResult {
  const mapped = mapOnboardingIntentV2ToEngineInput(onboardingIntent);
  if (!mapped.ok) {
    return {
      status:
        mapped.code === "INVALID_INPUT"
          ? "INVALID_INPUT"
          : mapped.code === "INVALID_DESTINATION"
            ? "INVALID_DESTINATION"
            : mapped.code === "NEEDS_INPUT"
              ? "NEEDS_INPUT"
              : "BLOCKED",
      onboardingIntent,
      diagnostics: mapped.diagnostics,
      errors: mapped.errors,
    };
  }

  try {
    const generated = generateCripqerPageWithEngineV2(mapped.engineInput, options);
    const validation = validateTemplate(generated.editorConfig);
    if (!validation.valid) {
      return {
        status: "INVALID_ENGINE_OUTPUT",
        onboardingIntent,
        diagnostics: mapped.diagnostics,
        errors: validation.issues.map((issue) => `${issue.path}: ${issue.message}`),
      };
    }
    return {
      status: "GENERATED",
      onboardingIntent,
      engineInput: mapped.engineInput,
      editorConfig: generated.editorConfig,
      canonicalEnvelopePreview: generated.canonicalEnvelope,
      generationMetadata: generated.generation,
      diagnostics: mapped.diagnostics,
    };
  } catch (error) {
    const issues =
      error && typeof error === "object" && "issues" in error && Array.isArray(error.issues)
        ? error.issues.map((issue: unknown) => JSON.stringify(issue))
        : [];
    return {
      status: "GENERATION_FAILED",
      onboardingIntent,
      diagnostics: mapped.diagnostics,
      errors: [error instanceof Error ? error.message : "Engine V2 generation failed.", ...issues],
    };
  }
}
