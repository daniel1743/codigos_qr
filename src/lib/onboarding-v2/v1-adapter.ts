import {
  type OnboardingIntentV1,
  type PrimaryActionType as PrimaryActionTypeV1,
} from "../onboarding/types";
import type {
  ActionTypeV2,
  BusinessCategoryV2,
  OnboardingIntentV2,
  PrimaryGoalV2,
  VisualDirectionV2,
} from "./types";

export interface OnboardingV1LossReport {
  missingDomains: string[];
  assumptions: string[];
  warnings: string[];
}

export interface OnboardingV1AdapterResult {
  intent: OnboardingIntentV2;
  lossReport: OnboardingV1LossReport;
}

const BUSINESS_MAP: Record<string, BusinessCategoryV2> = {
  belleza: "beauty",
  profesional: "professional",
  creador: "creator",
  restaurante: "food",
  fitness: "fitness",
  local: "local",
  freelancer: "freelancer",
  otro: "other",
};

const GOAL_MAP: Record<OnboardingIntentV1["primary_goal"], PrimaryGoalV2> = {
  whatsapp: "whatsapp",
  booking: "bookings",
  sell: "sell",
  leads: "contacts",
  portfolio: "show_portfolio",
  social: "social_growth",
};

const PERSONALITY_MAP: Record<OnboardingIntentV1["visual_personality"], VisualDirectionV2> = {
  elegant: "elegant",
  minimal: "minimal",
  modern: "modern",
  professional: "professional",
  energetic: "energetic",
  premium: "premium",
};

const ACTION_MAP: Record<PrimaryActionTypeV1, ActionTypeV2> = {
  whatsapp: "whatsapp",
  booking: "book",
  website: "website",
  instagram: "follow",
  email: "email",
};

function normalized(value: string): string {
  return value.trim();
}

export function adaptOnboardingV1ToV2(source: OnboardingIntentV1): OnboardingV1AdapterResult {
  const lossReport: OnboardingV1LossReport = {
    missingDomains: ["contentNeeds", "media", "scope", "commercial", "secondaryActions"],
    assumptions: [
      "density defaults to auto because V1 has no scope preference",
      "media preference defaults to no_preference because V1 has no media semantics",
      "secondary actions default to an empty array because V1 has only one primary action",
    ],
    warnings: [],
  };

  const rawBusinessType = normalized(source.business_type);
  const category = BUSINESS_MAP[rawBusinessType] ?? "other";
  const customCategory =
    category === "other"
      ? normalized(source.business_other ?? "") ||
        (BUSINESS_MAP[rawBusinessType] ? undefined : rawBusinessType)
      : undefined;
  if (category === "other" && !customCategory) {
    lossReport.warnings.push("V1 did not provide a custom category for its other business type.");
  }
  if (!BUSINESS_MAP[rawBusinessType]) {
    lossReport.warnings.push(
      `V1 business type '${rawBusinessType}' was preserved as a custom category.`,
    );
  }

  const intent: OnboardingIntentV2 = {
    version: "2",
    identity: {
      displayName: normalized(source.identity.name),
      professionOrActivity: normalized(source.identity.profession),
      ...(source.identity.bio.trim() ? { bio: source.identity.bio.trim() } : {}),
    },
    business: {
      category,
      ...(customCategory ? { customCategory } : {}),
    },
    outcome: {
      primaryGoal: GOAL_MAP[source.primary_goal],
    },
    visualDirection: {
      preference: PERSONALITY_MAP[source.visual_personality],
    },
    contentNeeds: { items: [] },
    actions: {
      primary: {
        type: ACTION_MAP[source.primary_action.type],
        source: "user",
        value: normalized(source.primary_action.value),
      },
      secondary: [],
    },
    media: { preference: "no_preference" },
    scope: { density: "auto", userSelected: false },
    meta: {
      version: "2",
      completedAt: source.meta.completed_at,
      source: "onboarding_v2",
    },
  };

  return { intent, lossReport };
}
