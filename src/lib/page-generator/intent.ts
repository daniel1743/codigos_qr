/**
 * PAGES_7 — GeneratedPageInput → OnboardingIntentV2.
 *
 * The EXISTING semantic intent contract (OnboardingIntentV2) is reused as the
 * generator input language. Nothing here invents content: the title, business
 * identity, description, CTA destination and items all come from the owner.
 */

import { normalizeBusinessCategory } from "@/lib/parametric-engine-v2/normalize";
import type { BusinessCategoryV2, OnboardingIntentV2 } from "@/lib/onboarding-v2/types";
import { GENERATED_PAGE_OBJECTIVE_PRESETS } from "./objective-presets";
import type { GeneratedPageInput } from "./types";
import { generatedPageItems } from "./validation";
import { ownerContentFromGeneratedPageInput } from "./owner-content";

function categoryFor(activity: string): BusinessCategoryV2 {
  // The engine's own normalizer is authoritative: "other" stays "other" and is
  // forwarded as the free-form activity, never forced into a wrong vertical.
  return normalizeBusinessCategory(activity.trim()) as BusinessCategoryV2;
}

function businessFor(activity: string, explicit?: BusinessCategoryV2): OnboardingIntentV2["business"] {
  const category = explicit ?? categoryFor(activity);
  return {
    category,
    ...(category === "other" ? { customCategory: activity.trim() } : {}),
  };
}

export interface GeneratedPageIntentOptions {
  now?: string;
}

/**
 * Pure semantic mapping. It produces the engine input language only — no
 * renderer values, no page ids, no routes, no persistence.
 */
export function buildGeneratedPageIntent(
  input: GeneratedPageInput,
  options: GeneratedPageIntentOptions = {},
): OnboardingIntentV2 {
  const preset = GENERATED_PAGE_OBJECTIVE_PRESETS[input.objective];
  const title = input.title.trim();
  const activity = input.activity.trim();
  const description = input.description?.trim() ?? "";
  const cta = input.cta;
  const items = generatedPageItems(input);
  const ownerContent = ownerContentFromGeneratedPageInput(input);

  return {
    version: "2",
    identity: {
      displayName: title,
      professionOrActivity: activity,
      ...(description ? { bio: description } : {}),
    },
    business: businessFor(activity, input.businessCategory),
    outcome: {
      primaryGoal: input.primaryGoal ?? preset.goal,
      experienceHint: preset.experienceHint,
    },
    visualDirection: {
      preference:
        input.style && input.style !== "let_cripqer_decide" ? input.style : "let_cripqer_decide",
    },
    contentNeeds: {
      items: preset.contentNeeds.map((type) => ({ type })),
      ...(items.length === 0 ? { userHasNoContentYet: true } : {}),
    },
    actions: {
      ...(cta && cta.value.trim()
        ? {
            primary: {
              type: cta.type,
              source: "user" as const,
              value: cta.value.trim(),
            },
          }
        : {}),
      secondary: [],
    },
    media: {
      preference: items.some((item) => item.imageUrl) ? "own_media" : "minimal_media",
    },
    scope: { density: preset.density, userSelected: true },
    ownerContent,
    meta: {
      version: "2",
      completedAt: options.now ?? new Date().toISOString(),
      // The frozen semantic contract only declares this source today. PAGES_7
      // reuses it as the generator language instead of forking a second schema.
      source: "onboarding_v2",
      locale: "es",
    },
  };
}
