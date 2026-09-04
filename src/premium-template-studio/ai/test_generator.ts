import type { AIUserIntent } from "./types";
import { recommendTemplateRecipes, validateAndNormalizeConfig } from "./index";
import { getTemplateDefinition } from "../templates/definitions";
import type { BioTemplateConfig } from "../types";

/**
 * Minimal developer test generator to verify the AI pipeline offline.
 */
export function generateMockAIConfig(
  intent: AIUserIntent,
  currentConfig?: BioTemplateConfig,
): BioTemplateConfig {
  // 1. Map intent to a recommended recipe ID
  const recommendedIds = recommendTemplateRecipes(intent);
  const selectedRecipeId = recommendedIds[0] || "creator-premium-001";

  // 2. Fetch the actual template definition from the registry
  const recipe = getTemplateDefinition(selectedRecipeId);

  // 3. (Mock step) An AI would normally build the full config or return partial overrides.
  // We'll mock the AI returning a full config based on the recipe's build() output,
  // but tweaking the profile to match the intent.
  const rawAIOutput: Partial<BioTemplateConfig> = {
    ...recipe.build(),
    profile: {
      ...recipe.build().profile,
      name: `${intent.businessType} Mock`,
      description: `Generated premium template matching visual style: ${intent.visualStyle}`,
      role: intent.businessType,
    },
  };

  // 4. Validate and normalize the output (the AI safety pipeline)
  const result = validateAndNormalizeConfig(rawAIOutput, currentConfig, {
    preserveProfileName: false, // Let the AI change the name for this test
    preserveProfileAvatar: true, // Keep the current avatar if any
  });

  if (!result.valid || !result.config) {
    throw new Error(`AI Config Validation Failed: ${result.errors.join(", ")}`);
  }

  return result.config;
}

export const MOCK_INTENTS: AIUserIntent[] = [
  {
    businessType: "Barber",
    primaryGoal: "booking",
    secondaryGoals: ["reviews"],
    visualStyle: "dark premium",
  },
  {
    businessType: "Dermatologist",
    primaryGoal: "booking",
    secondaryGoals: ["information"],
    visualStyle: "clean minimal",
    preferredTemplateFamily: "Medical",
  },
  {
    businessType: "DJ",
    primaryGoal: "portfolio",
    visualStyle: "bold editorial",
    preferredTemplateFamily: "Artist",
  },
];
