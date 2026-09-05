import { createServerFn } from "@tanstack/react-start";

import { requireOnboardingV2Enabled } from "../env";
import { validateOnboardingIntentV2 } from "./validation";
import type { OnboardingIntentV2 } from "./types";
import type { OnboardingV2GenerationResult } from "./engine-v2-generation";

interface GenerateOnboardingV2PageInput {
  intent: OnboardingIntentV2;
  now?: string;
}

function validateGenerationInput(value: unknown): GenerateOnboardingV2PageInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Onboarding V2 generation input.");
  }

  const input = value as Partial<GenerateOnboardingV2PageInput>;
  const validation = validateOnboardingIntentV2(input.intent);
  if (!validation.valid) {
    throw new Error(
      validation.issues.map((issue) => `${issue.path || "intent"}: ${issue.message}`).join(" "),
    );
  }

  return {
    intent: input.intent as OnboardingIntentV2,
    ...(input.now ? { now: input.now } : {}),
  };
}

/**
 * Server boundary for the server-only Engine V2 entrypoint. The generated
 * result is returned to the authenticated browser for the existing canonical
 * persistence path; Engine V2 itself never enters the client bundle.
 */
export const generateOnboardingV2PageFn = createServerFn({
  method: "POST",
  // BioTemplateConfig is a validated JSON object, but its domain interface is
  // intentionally not an index-signature Record. The runtime still returns
  // only the serialized generation result across this server boundary.
  strict: false,
})
  .validator(validateGenerationInput)
  .handler(async ({ data }): Promise<OnboardingV2GenerationResult> => {
    requireOnboardingV2Enabled();
    const { generateFromOnboardingIntentV2 } = await import("./engine-v2-generation");
    return generateFromOnboardingIntentV2(data.intent, data.now ? { now: data.now } : {});
  });
