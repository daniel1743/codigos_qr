import { createServerFn } from "@tanstack/react-start";

import type { OwnerContentInput } from "@/lib/page-generator/owner-content";
import { validateOnboardingIntentV2 } from "./validation";
import type { OnboardingSmartPagesGenerationResult } from "./smart-pages-adapter";
import type { OnboardingIntentV2 } from "./types";

interface SmartPagesGenerationInput {
  intent: OnboardingIntentV2;
  ownerContent?: OwnerContentInput;
  now: string;
}

const SAFE_GENERATION_FAILURE =
  "No pudimos crear tu página todavía. Tus datos siguen aquí. Revisa la información o inténtalo nuevamente.";

function generationFailure(): OnboardingSmartPagesGenerationResult {
  return {
    ok: false,
    errors: [SAFE_GENERATION_FAILURE],
    diagnostics: {
      mappedFields: [],
      deferredFields: [],
      unsupportedFields: [],
      missingOwnerFacts: [],
      warnings: [],
    },
  };
}

function validateInput(value: unknown): SmartPagesGenerationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Los datos del onboarding no son válidos.");
  }

  const input = value as Partial<SmartPagesGenerationInput>;
  const validation = validateOnboardingIntentV2(input.intent);
  if (!validation.valid) {
    throw new Error(
      validation.issues.map((issue) => `${issue.path || "intent"}: ${issue.message}`).join(" "),
    );
  }
  if (typeof input.now !== "string" || !input.now.trim()) {
    throw new Error("Falta la fecha de generación.");
  }

  return {
    intent: input.intent as OnboardingIntentV2,
    ...(input.ownerContent ? { ownerContent: input.ownerContent } : {}),
    now: input.now,
  };
}

/**
 * Browser-safe RPC boundary for the real Smart Pages 5 seam. The adapter and
 * Engine V2 remain server-only; the browser receives only the validated,
 * in-memory generation result.
 */
export const generateSmartPageFromOnboardingFn = createServerFn({
  method: "POST",
  strict: false,
})
  .validator(validateInput)
  .handler(async ({ data }): Promise<OnboardingSmartPagesGenerationResult> => {
    try {
      const { generateSmartPageFromOnboarding } = await import("./smart-pages-adapter");
      const { searchContextualHero } = await import("@/lib/parametric-engine-v2/media/contextual");
      const ownerContent = data.ownerContent ?? data.intent.ownerContent ?? {};
      const contextual = await searchContextualHero({
        profession: data.intent.identity.professionOrActivity,
        style: data.intent.visualDirection.preference ?? undefined,
        goal: data.intent.outcome.primaryGoal,
        ownerCoverAvailable: Boolean(
          ownerContent.media?.cover || data.intent.identity.bannerAssetRef,
        ),
      });
      return generateSmartPageFromOnboarding(data.intent, {
        ...(data.ownerContent ? { ownerContent: data.ownerContent } : {}),
        ...(contextual.media ? { curatedMedia: contextual.media } : {}),
        now: data.now,
      });
    } catch (error) {
      // Keep the real exception in the server log while returning a stable,
      // serializable failure contract to the browser. This prevents the
      // global error page HTML from becoming user-facing onboarding content.
      console.error("[Smart Pages onboarding generation]", error);
      return generationFailure();
    }
  });
