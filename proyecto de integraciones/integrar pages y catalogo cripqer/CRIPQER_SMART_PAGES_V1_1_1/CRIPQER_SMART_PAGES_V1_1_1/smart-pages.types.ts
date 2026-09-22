/**
 * CRIPQER SMART PAGES V1 — generation & runtime contracts.
 *
 * PageGenerationRequest is intentionally independent from any onboarding
 * contract. A host adapter maps OnboardingIntentV2 -> PageGenerationRequest.
 */

import type { NormalizedContentV1, SalesActionV1, SalesMode } from "./catalog.types";
import type { EcosystemContextV1, NavItemV1 } from "./ecosystem";

export type ExperienceType = "catalog" | "services" | "portfolio" | "menu" | "listings" | "landing";

export type PageGoal = "sell" | "book" | "quote" | "showcase" | "inform" | "contact";

export type Density = "minimal" | "balanced" | "rich";

export interface ContentCapabilitiesV1 {
  hasCatalog: boolean;
  hasCategories: boolean;
  hasPrices: boolean;
  hasMedia: boolean;
  hasTeam: boolean;
  hasTestimonials: boolean;
  hasFaq: boolean;
  hasLocation: boolean;
  hasBooking: boolean;
  hasWhatsapp: boolean;
}

export interface PageGenerationRequest {
  version: "1";
  businessType: string;
  goal: PageGoal;
  density: Density;
  salesMode: SalesMode;
  primaryAction: SalesActionV1;
  secondaryActions: SalesActionV1[];
  content: NormalizedContentV1;
  /** Derived from content unless the host overrides it. */
  contentCapabilities?: Partial<ContentCapabilitiesV1>;
  preferences?: {
    experienceType?: ExperienceType;
    /** Deterministic variation seed; same seed => same plan. */
    variant?: number;
    maxPages?: number;
    showSearch?: boolean;
    showFilters?: boolean;
  };
}

export type SectionKind =
  | "hero"
  | "sectionHeading"
  | "categoryNav"
  | "search"
  | "filterBar"
  | "productGrid"
  | "serviceGrid"
  | "portfolioGrid"
  | "menuSections"
  | "listingGrid"
  | "featured"
  | "gallery"
  | "pricing"
  | "team"
  | "testimonials"
  | "faq"
  | "about"
  | "missionVision"
  | "whyUs"
  | "location"
  | "contact"
  | "quoteCta"
  | "whatsappCta"
  | "bookingCta"
  | "footer";

export interface SectionPlanV1 {
  id: string;
  kind: SectionKind;
  order: number;
  title?: string;
  /** Which normalized content this section reads. */
  binding?: {
    catalogId?: string;
    categoryId?: string;
    featuredOnly?: boolean;
    limit?: number;
  };
  options?: Record<string, string | number | boolean>;
}

export type HeroVariant = "centered" | "split" | "media" | "compact";

export interface PagePlanV1 {
  version: "1";
  pageId: string;
  title: string;
  slug: string;
  experienceType: ExperienceType;
  sections: SectionPlanV1[];
  ctaHierarchy: { primary: SalesActionV1; secondary: SalesActionV1[] };
  /** In-page + cross-page navigation for the premium navbar. */
  navigation?: NavItemV1[];
  heroVariant?: HeroVariant;
  runtimeRequirements: {
    needsSearch: boolean;
    needsFilters: boolean;
    needsDetailView: boolean;
    needsCategoryNav: boolean;
    checkoutEnabled: false;
  };
}

export interface MiniSitePlanV1 {
  version: "1";
  projectId: string;
  business: { name: string; businessType: string; tagline?: string };
  navigation: Array<{ pageId: string; label: string; slug: string }>;
  pages: PagePlanV1[];
}

/** Everything the Master Runtime needs to render, with no orchestration logic. */
export interface RuntimePageConfigV1 {
  version: "1";
  plan: PagePlanV1;
  content: NormalizedContentV1;
  theme: RuntimeThemeV1;
  /** Optional host context (identity, analytics, QR, public base URL). */
  ecosystem?: EcosystemContextV1;
  /** Reserved: always false in V1. */
  checkoutEnabled: false;
}

export interface RuntimeThemeV1 {
  accent: string;
  accentContrast: string;
  /** Page background behind surfaces. */
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  mutedText: string;
  border: string;
  radius: string;
  radiusSm: string;
  shadow: string;
  shadowStrong: string;
  headingFont: string;
  bodyFont: string;
  /** Vertical rhythm between sections. */
  sectionSpacing: string;
  /** Max content width of the page container. */
  contentWidth: string;
  buttonRadius: string;
  buttonStyle: "solid" | "soft" | "outline";
  /** Sticky navbar when the host asks for it. */
  stickyNav: boolean;
}

export const DEFAULT_RUNTIME_THEME: RuntimeThemeV1 = {
  accent: "#111827",
  accentContrast: "#ffffff",
  background: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#f7f8fa",
  text: "#0d1117",
  mutedText: "#616b7a",
  border: "#e6e8ec",
  radius: "18px",
  radiusSm: "12px",
  shadow: "0 1px 2px rgba(13,17,23,0.04), 0 8px 24px -16px rgba(13,17,23,0.24)",
  shadowStrong: "0 12px 40px -12px rgba(13,17,23,0.28)",
  headingFont: "inherit",
  bodyFont: "inherit",
  sectionSpacing: "clamp(40px, 6vw, 80px)",
  contentWidth: "1120px",
  buttonRadius: "999px",
  buttonStyle: "solid",
  stickyNav: true,
};
