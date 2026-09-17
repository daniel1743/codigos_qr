/**
 * CRIPQER — PAGES_7 Page Generator integration contract (host-owned).
 *
 * This is NOT a second page engine. It is the minimal adapter contract that
 * turns a business's intent ("quiero una página de Servicios") into the EXISTING
 * canonical document flow:
 *
 *   GeneratedPageInput
 *     → PageGeneratorAdapter (semantic intent + canonical validation)
 *       → Engine V2 host entrypoint (existing generator)
 *         → canonical BioTemplateConfig
 *           → validateTemplate()
 *             → pageCanonicalService.saveDraft() → pages.template_config
 *
 * The generator never owns persistence, public identity, QR, alias, routing or
 * rendering.
 */

import type { PageType } from "@/types/database";
import type {
  ActionTypeV2,
  BusinessCategoryV2,
  ContentNeedV2,
  DensityV2,
  ExperienceIntentV2,
  PrimaryGoalV2,
} from "@/lib/onboarding-v2/types";

/** The business experiences a child Page can be generated for. */
export const GENERATED_PAGE_OBJECTIVES = [
  "services",
  "catalog",
  "portfolio",
  "menu",
  "promotion",
  "event",
] as const;
export type GeneratedPageObjective = (typeof GENERATED_PAGE_OBJECTIVES)[number];

/** Primary button the owner explicitly supplies. Never invented. */
export const GENERATED_PAGE_ACTION_TYPES = [
  "whatsapp",
  "website",
  "book",
  "follow",
  "email",
] as const;
export type GeneratedPageActionType = (typeof GENERATED_PAGE_ACTION_TYPES)[number];

export const GENERATED_PAGE_STYLES = [
  "let_cripqer_decide",
  "elegant",
  "minimal",
  "modern",
  "professional",
  "energetic",
  "premium",
] as const;
export type GeneratedPageStyle = (typeof GENERATED_PAGE_STYLES)[number];

/**
 * One owner-supplied item. Every field is real data typed by the owner — the
 * engine never fabricates titles, prices, links, dates or images.
 */
export interface GeneratedPageItem {
  title: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  url?: string;
  date?: string;
}

export interface GeneratedPageCta {
  type: GeneratedPageActionType;
  value: string;
}

export interface GeneratedPageInput {
  objective: GeneratedPageObjective;
  title: string;
  businessName: string;
  activity: string;
  businessCategory?: GeneratedBusinessCategory;
  description?: string;
  /**
   * Owner-supplied cover image (https). It is real owner media — never invented.
   * Media-led experiences (Catálogo, Portafolio) require it: the Engine V2 media
   * strategy only plans product/portfolio blocks when a real cover or avatar
   * exists.
   */
  coverImageUrl?: string;
  /** Owner-supplied avatar image forwarded to the existing Engine media seam. */
  avatarImageUrl?: string;
  cta?: GeneratedPageCta;
  style?: GeneratedPageStyle;
  /**
   * Optional primary-goal carry-through from Smart Pages. This is an adapter
   * field, not canonical document data; legacy callers continue to use the
   * objective preset when it is absent.
   */
  primaryGoal?: PrimaryGoalV2;
  items: GeneratedPageItem[];
}

/** How one objective is represented by the existing canonical PageType. */
export type GeneratedItemKind = "service" | "product" | "project" | "event";

/** Business categories accepted by the semantic intent contract. */
export type GeneratedBusinessCategory = BusinessCategoryV2;

/** CTA types the host adapter can represent without changing Engine business logic. */
export type GeneratedActionType = Extract<
  ActionTypeV2,
  "whatsapp" | "website" | "book" | "follow" | "email"
>;

export const GENERATED_PAGE_ACTION_LABELS: Record<GeneratedPageActionType, string> = {
  whatsapp: "WhatsApp",
  website: "Sitio web",
  book: "Reservar",
  follow: "Instagram",
  email: "Email",
};
