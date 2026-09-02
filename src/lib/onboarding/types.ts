/**
 * CRIPQER — OnboardingIntentV1 (types only)
 * ---------------------------------------------------------------------------
 * The single deterministic object produced by the premium onboarding flow.
 * It will later be consumed by the Parametric Design Engine. It contains no
 * CSS, no template recipe and no AI prompt — intent only.
 *
 * Runtime config lives in ./config, invariants in ./validation.
 */

export const PRIMARY_GOALS = [
  "whatsapp",
  "booking",
  "sell",
  "leads",
  "portfolio",
  "social",
] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

export const VISUAL_PERSONALITIES = [
  "elegant",
  "minimal",
  "modern",
  "professional",
  "energetic",
  "premium",
] as const;
export type VisualPersonality = (typeof VISUAL_PERSONALITIES)[number];

export const PRIMARY_ACTION_TYPES = [
  "whatsapp",
  "booking",
  "website",
  "instagram",
  "email",
] as const;
export type PrimaryActionType = (typeof PRIMARY_ACTION_TYPES)[number];

export interface OnboardingIdentity {
  name: string;
  profession: string;
  bio: string;
  /**
   * In-memory object-URL preview ONLY. Never persisted, never serialized,
   * never uploaded in V1.
   */
  avatar_preview: string | null;
}

export interface OnboardingPrimaryAction {
  type: PrimaryActionType;
  value: string;
}

export interface OnboardingIntentV1 {
  business_type: string;
  business_other: string | null;
  primary_goal: PrimaryGoal;
  visual_personality: VisualPersonality;
  identity: OnboardingIdentity;
  primary_action: OnboardingPrimaryAction;
  meta: {
    version: "1";
    completed_at: string;
  };
}

/** Work-in-progress shape while the user moves through the steps. */
export interface OnboardingDraft {
  business_type: string | null;
  business_other: string | null;
  primary_goal: PrimaryGoal | null;
  visual_personality: VisualPersonality | null;
  identity: OnboardingIdentity;
  primary_action: { type: PrimaryActionType | null; value: string };
}

/** Draft minus any non-persistable field (blob URLs). */
export type PersistedDraft = Omit<OnboardingDraft, "identity"> & {
  identity: Omit<OnboardingIdentity, "avatar_preview">;
};

export const EMPTY_DRAFT: OnboardingDraft = {
  business_type: null,
  business_other: null,
  primary_goal: null,
  visual_personality: null,
  identity: { name: "", profession: "", bio: "", avatar_preview: null },
  primary_action: { type: null, value: "" },
};

export const IDENTITY_LIMITS = { name: 60, profession: 60, bio: 160 } as const;

export type IntentFieldError =
  | "business_type"
  | "business_other"
  | "primary_goal"
  | "visual_personality"
  | "identity.name"
  | "identity.profession"
  | "primary_action.type"
  | "primary_action.value";
