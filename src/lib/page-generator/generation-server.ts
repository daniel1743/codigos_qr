import { createServerFn } from "@tanstack/react-start";

import type { OnboardingV2GenerationResult } from "@/lib/onboarding-v2/engine-v2-generation";
import { validateOnboardingIntentV2 } from "@/lib/onboarding-v2/validation";
import type { OnboardingIntentV2 } from "@/lib/onboarding-v2/types";
import type {
  EngineV2HostContentBlocks,
  EngineV2HostGenerationOptions,
} from "@/lib/parametric-engine-v2/internal-entrypoint";
import type { GenerateV2Options } from "@/lib/parametric-engine-v2/power-editor/generate-v2";

export interface GeneratePageCanonicalInput {
  intent: OnboardingIntentV2;
  contentBlocks?: EngineV2HostContentBlocks;
  engineOptions?: GenerateV2Options;
  now?: string;
}

function validateInput(value: unknown): GeneratePageCanonicalInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Los datos para generar la página no son válidos.");
  }
  const input = value as Partial<GeneratePageCanonicalInput>;
  const validation = validateOnboardingIntentV2(input.intent);
  if (!validation.valid) {
    throw new Error(
      validation.issues.map((issue) => `${issue.path || "intent"}: ${issue.message}`).join(" "),
    );
  }
  if (
    input.contentBlocks !== undefined &&
    (typeof input.contentBlocks !== "object" ||
      input.contentBlocks === null ||
      Array.isArray(input.contentBlocks))
  ) {
    throw new Error("El contenido de la página no es válido.");
  }
  if (
    input.engineOptions !== undefined &&
    (typeof input.engineOptions !== "object" ||
      input.engineOptions === null ||
      Array.isArray(input.engineOptions))
  ) {
    throw new Error("Las opciones de generación no son válidas.");
  }
  return {
    intent: input.intent as OnboardingIntentV2,
    ...(input.contentBlocks ? { contentBlocks: input.contentBlocks } : {}),
    ...(input.engineOptions ? { engineOptions: input.engineOptions } : {}),
    ...(input.now ? { now: input.now } : {}),
  };
}

/**
 * SERVER BOUNDARY for the existing Engine V2 generator.
 *
 * This is the same generation architecture used by the profile handoff: the
 * frozen engine stays server-only, the browser receives only the canonical
 * `editorConfig`. No new engine, no second generation pipeline — the only
 * addition is the owner-supplied structured content pass-through.
 */
export const generatePageCanonicalFn = createServerFn({
  method: "POST",
  // BioTemplateConfig is a validated JSON object, but its domain interface is
  // intentionally not an index-signature Record.
  strict: false,
})
  .validator(validateInput)
  .handler(async ({ data }): Promise<OnboardingV2GenerationResult> => {
    const { generateFromOnboardingIntentV2 } =
      await import("@/lib/onboarding-v2/engine-v2-generation");
    const options: EngineV2HostGenerationOptions = {
      ...(data.now ? { now: data.now } : {}),
      ...(data.contentBlocks ? { contentBlocks: data.contentBlocks } : {}),
      ...(data.engineOptions ? { engine: data.engineOptions } : {}),
    };
    return generateFromOnboardingIntentV2(data.intent, options);
  });
