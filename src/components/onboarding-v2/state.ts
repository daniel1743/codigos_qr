import {
  validateOnboardingIntentV2,
  type OnboardingV2ValidationResult,
} from "@/lib/onboarding-v2/validation";
import type {
  ActionIntentV2,
  BusinessCategoryV2,
  CommercialModeV2,
  ContentNeedSelectionV2,
  DensityV2,
  MediaPreferenceV2,
  OnboardingIntentV2,
  PrimaryGoalV2,
  VisualDirectionV2,
} from "@/lib/onboarding-v2/types";
import { ONBOARDING_V2_STORAGE_KEY } from "@/lib/onboarding-v2/config";

export interface OnboardingV2Draft {
  identity: {
    displayName: string;
    professionOrActivity: string;
    bio: string;
    avatarPreview: string | null;
  };
  business: { category: BusinessCategoryV2 | null; customCategory: string };
  outcome: { primaryGoal: PrimaryGoalV2 | null; customGoal: string };
  visualDirection: { preference: VisualDirectionV2 | null; customDescription: string };
  contentNeeds: { items: ContentNeedSelectionV2[]; userHasNoContentYet: boolean };
  actions: { primary: ActionIntentV2 | null; secondary: ActionIntentV2[] };
  media: {
    preference: MediaPreferenceV2 | null;
    hasOwnPhotos?: boolean;
    hasVideos?: boolean;
    hasLogoOrAvatar?: boolean;
    hasPortfolioOrGalleryAssets?: boolean;
    needsMediaHelp?: boolean;
  };
  scope: { density: DensityV2; userSelected: boolean };
  commercial: { mode: CommercialModeV2 | null; relevant: boolean };
}

export function createEmptyOnboardingV2Draft(): OnboardingV2Draft {
  return {
    identity: { displayName: "", professionOrActivity: "", bio: "", avatarPreview: null },
    business: { category: null, customCategory: "" },
    outcome: { primaryGoal: null, customGoal: "" },
    visualDirection: { preference: null, customDescription: "" },
    contentNeeds: { items: [], userHasNoContentYet: false },
    actions: { primary: null, secondary: [] },
    media: { preference: null },
    scope: { density: "auto", userSelected: false },
    commercial: { mode: null, relevant: false },
  };
}

export function isCommercialRelevant(draft: OnboardingV2Draft): boolean {
  return (
    draft.outcome.primaryGoal === "sell" ||
    draft.contentNeeds.items.some((item) => item.type === "products")
  );
}

export function reconcileOnboardingV2Draft(draft: OnboardingV2Draft): OnboardingV2Draft {
  const relevant = isCommercialRelevant(draft);
  return {
    ...draft,
    commercial: relevant
      ? { ...draft.commercial, relevant: true }
      : { mode: null, relevant: false },
  };
}

export function toPersistedDraftV2(draft: OnboardingV2Draft): Omit<
  OnboardingV2Draft,
  "identity"
> & {
  identity: Omit<OnboardingV2Draft["identity"], "avatarPreview">;
} {
  const { avatarPreview: _avatarPreview, ...identity } = draft.identity;
  return { ...draft, identity };
}

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

export function fromPersistedDraftV2(raw: unknown): OnboardingV2Draft {
  const empty = createEmptyOnboardingV2Draft();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const record = raw as Record<string, unknown>;
  const identity = record["identity"] as Record<string, unknown> | undefined;
  const business = record["business"] as Record<string, unknown> | undefined;
  const outcome = record["outcome"] as Record<string, unknown> | undefined;
  const visual = record["visualDirection"] as Record<string, unknown> | undefined;
  const content = record["contentNeeds"] as Record<string, unknown> | undefined;
  const actions = record["actions"] as Record<string, unknown> | undefined;
  const media = record["media"] as Record<string, unknown> | undefined;
  const scope = record["scope"] as Record<string, unknown> | undefined;
  const commercial = record["commercial"] as Record<string, unknown> | undefined;
  return reconcileOnboardingV2Draft({
    identity: {
      displayName: asString(identity?.["displayName"]),
      professionOrActivity: asString(identity?.["professionOrActivity"]),
      bio: asString(identity?.["bio"]),
      avatarPreview: null,
    },
    business: {
      category: (business?.["category"] as BusinessCategoryV2 | null) ?? null,
      customCategory: asString(business?.["customCategory"]),
    },
    outcome: {
      primaryGoal: (outcome?.["primaryGoal"] as PrimaryGoalV2 | null) ?? null,
      customGoal: asString(outcome?.["customGoal"]),
    },
    visualDirection: {
      preference: (visual?.["preference"] as VisualDirectionV2 | null) ?? null,
      customDescription: asString(visual?.["customDescription"]),
    },
    contentNeeds: {
      items: Array.isArray(content?.["items"])
        ? (content["items"] as ContentNeedSelectionV2[])
        : [],
      userHasNoContentYet: content?.["userHasNoContentYet"] === true,
    },
    actions: {
      primary: (actions?.["primary"] as ActionIntentV2 | null) ?? null,
      secondary: Array.isArray(actions?.["secondary"])
        ? (actions["secondary"] as ActionIntentV2[])
        : [],
    },
    media: {
      preference: (media?.["preference"] as MediaPreferenceV2 | null) ?? null,
      hasOwnPhotos: media?.["hasOwnPhotos"] === true,
      hasVideos: media?.["hasVideos"] === true,
      hasLogoOrAvatar: media?.["hasLogoOrAvatar"] === true,
      hasPortfolioOrGalleryAssets: media?.["hasPortfolioOrGalleryAssets"] === true,
      needsMediaHelp: media?.["needsMediaHelp"] === true,
    },
    scope: {
      density: (scope?.["density"] as DensityV2) ?? "auto",
      userSelected: scope?.["userSelected"] === true,
    },
    commercial: {
      mode: (commercial?.["mode"] as CommercialModeV2 | null) ?? null,
      relevant: commercial?.["relevant"] === true,
    },
  });
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function buildOnboardingIntentV2(
  draft: OnboardingV2Draft,
  completedAt = new Date().toISOString(),
): { intent: OnboardingIntentV2 | null; validation: OnboardingV2ValidationResult } {
  const bio = optionalText(draft.identity.bio);
  const customCategory = optionalText(draft.business.customCategory);
  const customGoal = optionalText(draft.outcome.customGoal);
  const customDescription = optionalText(draft.visualDirection.customDescription);
  const identity = {
    displayName: draft.identity.displayName.trim(),
    professionOrActivity: draft.identity.professionOrActivity.trim(),
    ...(bio !== undefined ? { bio } : {}),
  };
  const candidate: OnboardingIntentV2 = {
    version: "2",
    identity,
    business: {
      category: draft.business.category ?? "other",
      ...(draft.business.category === "other" && customCategory !== undefined
        ? { customCategory }
        : {}),
    },
    outcome: {
      primaryGoal: draft.outcome.primaryGoal ?? "other",
      ...(draft.outcome.primaryGoal === "other" && customGoal !== undefined ? { customGoal } : {}),
    },
    visualDirection: {
      preference: draft.visualDirection.preference ?? "let_cripqer_decide",
      ...(draft.visualDirection.preference === "other" && customDescription !== undefined
        ? { customDescription }
        : {}),
    },
    contentNeeds: {
      items: draft.contentNeeds.items,
      ...(draft.contentNeeds.userHasNoContentYet ? { userHasNoContentYet: true } : {}),
    },
    actions: {
      ...(draft.actions.primary ? { primary: draft.actions.primary } : {}),
      secondary: draft.actions.secondary,
    },
    media: {
      preference: draft.media.preference ?? "no_preference",
      ...(draft.media.hasOwnPhotos ? { hasOwnPhotos: true } : {}),
      ...(draft.media.hasVideos ? { hasVideos: true } : {}),
      ...(draft.media.hasLogoOrAvatar ? { hasLogoOrAvatar: true } : {}),
      ...(draft.media.hasPortfolioOrGalleryAssets ? { hasPortfolioOrGalleryAssets: true } : {}),
      ...(draft.media.needsMediaHelp ? { needsMediaHelp: true } : {}),
    },
    scope: draft.scope,
    ...(isCommercialRelevant(draft) && draft.commercial.mode
      ? { commercial: { mode: draft.commercial.mode, relevant: true } }
      : {}),
    meta: { version: "2", completedAt, source: "onboarding_v2", locale: "es-CL" },
  };
  const validation = validateOnboardingIntentV2(candidate);
  return { intent: validation.valid ? candidate : null, validation };
}

export function persistDraftV2(draft: OnboardingV2Draft): void {
  try {
    window.sessionStorage.setItem(
      ONBOARDING_V2_STORAGE_KEY,
      JSON.stringify(toPersistedDraftV2(draft)),
    );
  } catch {
    /* Session storage is an optional convenience. */
  }
}
