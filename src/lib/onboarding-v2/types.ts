/**
 * CRIPQER — OnboardingIntentV2 semantic contract.
 *
 * This contract describes user/business intent only. It deliberately contains
 * no renderer settings, Power Editor values, commerce catalog data or routes.
 */

export const EXPERIENCE_INTENTS_V2 = [
  "personal_page",
  "professional_landing",
  "service_page",
  "catalog",
  "whatsapp_commerce",
  "ecommerce",
  "smart_mini_site",
  "other",
] as const;
export type ExperienceIntentV2 = (typeof EXPERIENCE_INTENTS_V2)[number];

export const BUSINESS_CATEGORIES_V2 = [
  "beauty",
  "professional",
  "creator",
  "food",
  "fitness",
  "local",
  "freelancer",
  "retail",
  "other",
] as const;
export type BusinessCategoryV2 = (typeof BUSINESS_CATEGORIES_V2)[number];

export const PRIMARY_GOALS_V2 = [
  "presence",
  "contacts",
  "whatsapp",
  "bookings",
  "show_services",
  "show_portfolio",
  "sell",
  "quote_requests",
  "social_growth",
  "other",
] as const;
export type PrimaryGoalV2 = (typeof PRIMARY_GOALS_V2)[number];

export const VISUAL_DIRECTIONS_V2 = [
  "elegant",
  "minimal",
  "modern",
  "professional",
  "energetic",
  "premium",
  "let_cripqer_decide",
  "other",
] as const;
export type VisualDirectionV2 = (typeof VISUAL_DIRECTIONS_V2)[number];

export const CONTENT_NEEDS_V2 = [
  "links",
  "services",
  "products",
  "portfolio",
  "gallery",
  "video",
  "team",
  "testimonials",
  "booking",
  "contact",
  "social_networks",
  "pricing",
  "location",
  "faq",
  "other",
] as const;
export type ContentNeedV2 = (typeof CONTENT_NEEDS_V2)[number];

export const ACTION_TYPES_V2 = [
  "whatsapp",
  "call",
  "book",
  "buy",
  "request_quote",
  "website",
  "menu",
  "follow",
  "email",
  "contact",
  "other",
] as const;
export type ActionTypeV2 = (typeof ACTION_TYPES_V2)[number];

export const DENSITIES_V2 = ["simple", "complete", "auto"] as const;
export type DensityV2 = (typeof DENSITIES_V2)[number];

export const COMMERCIAL_MODES_V2 = [
  "display_only",
  "contact",
  "booking",
  "quote",
  "sell",
  "hybrid",
] as const;
export type CommercialModeV2 = (typeof COMMERCIAL_MODES_V2)[number];

export const ACTION_SOURCES_V2 = ["user", "inferred"] as const;
export type ActionSourceV2 = (typeof ACTION_SOURCES_V2)[number];

export const MEDIA_PREFERENCES_V2 = [
  "own_media",
  "find_media",
  "minimal_media",
  "no_preference",
] as const;
export type MediaPreferenceV2 = (typeof MEDIA_PREFERENCES_V2)[number];

export interface ActionIntentV2 {
  type: ActionTypeV2;
  source: ActionSourceV2;
  value?: string;
  label?: string;
}

export interface ContentNeedSelectionV2 {
  type: ContentNeedV2;
  customLabel?: string;
}

export interface MediaIntentV2 {
  preference: MediaPreferenceV2;
  hasOwnPhotos?: boolean;
  hasVideos?: boolean;
  hasLogoOrAvatar?: boolean;
  hasPortfolioOrGalleryAssets?: boolean;
  needsMediaHelp?: boolean;
}

export interface OnboardingIntentV2 {
  version: "2";
  identity: {
    displayName: string;
    professionOrActivity: string;
    bio?: string;
    avatarAssetRef?: string;
    bannerAssetRef?: string;
  };
  business: {
    category: BusinessCategoryV2;
    customCategory?: string;
  };
  outcome: {
    primaryGoal: PrimaryGoalV2;
    customGoal?: string;
    experienceHint?: ExperienceIntentV2;
  };
  visualDirection: {
    preference: VisualDirectionV2;
    customDescription?: string;
  };
  contentNeeds: {
    items: ContentNeedSelectionV2[];
    userHasNoContentYet?: boolean;
  };
  actions: {
    primary?: ActionIntentV2;
    secondary: ActionIntentV2[];
  };
  media: MediaIntentV2;
  scope: {
    density: DensityV2;
    userSelected: boolean;
  };
  commercial?: {
    mode: CommercialModeV2;
    relevant: boolean;
  };
  /** Versioned namespaces for future semantic capabilities only. */
  extensions?: Record<string, unknown>;
  meta: {
    version: "2";
    completedAt: string;
    source: "onboarding_v2";
    locale?: string;
  };
}
