/**
 * CRIPQER SMART PAGES V1 - generation & planning contracts.
 *
 * Migrated from the authoritative CRIPQER_SMART_PAGES_V1_1_1 tree (SMART_PAGES_2).
 * Classification: ADAPT.
 *
 * These are TRANSIENT SEMANTIC PLANNING types only:
 *  - PagePlanV1 / MiniSitePlanV1 / PageGenerationRequest are planning DTOs.
 *  - They are NOT a database schema, NOT a BioTemplateConfig replacement and
 *    NOT a published document format.
 *  - The runtime rendering types (RuntimePageConfigV1 / RuntimeThemeV1 /
 *    DEFAULT_RUNTIME_THEME) were intentionally NOT migrated: rendering stays
 *    owned by PublicTemplateRenderer / Engine V2.
 *
 * PageGenerationRequest is intentionally independent from any onboarding
 * contract. A host adapter maps OnboardingIntentV2 -> PageGenerationRequest.
 */

import type { NormalizedContentV1, SalesActionV1, SalesMode } from "./catalog.types";

/**
 * Semantic navigation destination. `internal_page` / `section` reference the
 * TEMPORARY planner identifiers produced by PagePlanV1 - they are NOT database
 * UUIDs, public_id values, QR identities or aliases.
 */
export type SmartDestinationV1 =
  | { mode: "external"; url: string }
  | { mode: "internal_page"; pageId: string }
  | { mode: "section"; sectionId: string };

export interface NavItemV1 {
  id: string;
  label: string;
  destination: SmartDestinationV1;
}

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
  /**
   * TEMPORARY planner identifier (e.g. `page_my-business`). Not a database
   * UUID, public_id value, QR identity or alias.
   */
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
  /**
   * TEMPORARY planner identifier (e.g. `site_my-business`). Not a database
   * UUID, public_id value, QR identity or alias.
   */
  projectId: string;
  business: { name: string; businessType: string; tagline?: string };
  navigation: Array<{ pageId: string; label: string; slug: string }>;
  pages: PagePlanV1[];
}
