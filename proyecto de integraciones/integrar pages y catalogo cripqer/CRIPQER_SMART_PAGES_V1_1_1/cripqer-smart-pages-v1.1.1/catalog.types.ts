/**
 * CRIPQER SMART PAGES V1 — normalized content & catalog contracts.
 *
 * Portable: no framework, no host imports, no sandbox coupling.
 * Data integrity rule: critical business facts (price, stock, contact, address,
 * attributes) are NEVER invented. Missing data stays missing and is reported
 * through `confidence` / `review`.
 */

export type ItemType =
  "product" | "service" | "menu_item" | "portfolio_item" | "listing" | "project";

/** V1 visible modes. `checkout` exists as a future contract only. */
export type SalesMode = "contact" | "quote" | "booking" | "info" | "checkout";

export type SalesActionKind =
  | "whatsapp"
  | "contact"
  | "quote"
  | "call"
  | "email"
  | "external_booking"
  | "external_url"
  | "checkout";

export interface SalesActionV1 {
  kind: SalesActionKind;
  label: string;
  /** phone (whatsapp/call), email address, or absolute URL. */
  target?: string;
  /** Only used by whatsapp/quote — deterministic, never contains invented data. */
  messageTemplate?: string;
  enabled: boolean;
}

export interface MediaAssetV1 {
  id: string;
  url: string;
  alt: string;
  kind: "image" | "video";
}

export interface PriceV1 {
  /** Absent means "price not supplied" — never guess. */
  amount?: number;
  currency?: string;
  /** Free-form label taken verbatim from the source ("from $20", "on request"). */
  label?: string;
}

export interface CatalogCategoryV1 {
  id: string;
  name: string;
  description?: string;
  order: number;
}

export interface CatalogItemV1 {
  id: string;
  type: ItemType;
  name: string;
  description?: string;
  categoryId?: string;
  price?: PriceV1;
  media: MediaAssetV1[];
  /** Arbitrary source-provided facts (bedrooms, duration, ingredients...). */
  attributes: Array<{ key: string; label: string; value: string }>;
  salesMode: SalesMode;
  action?: SalesActionV1;
  featured: boolean;
  enabled: boolean;
  /** 0..1 — how confident normalization is about this record. */
  confidence: number;
  /** Field names that the user should review/complete. */
  review: string[];
}

export interface CatalogV1 {
  id: string;
  kind: "catalog" | "menu" | "portfolio" | "listings" | "services";
  categories: CatalogCategoryV1[];
  items: CatalogItemV1[];
}

export interface TeamMemberV1 {
  id: string;
  name: string;
  role?: string;
  bio?: string;
  photo?: MediaAssetV1;
}

export interface TestimonialV1 {
  id: string;
  quote: string;
  author?: string;
  context?: string;
  /** Optional, only when supplied by the source. Never invented. */
  avatar?: MediaAssetV1;
  /** 0..5, only when explicitly supplied. Never invented. */
  rating?: number;
}

export interface FaqEntryV1 {
  id: string;
  question: string;
  answer: string;
}

export interface ContactInfoV1 {
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  mapUrl?: string;
  hours?: string;
  socials: Array<{ label: string; url: string }>;
  bookingUrl?: string;
}

/** Optional differentiator ("why choose us") card. Never invented. */
export interface DifferentiatorV1 {
  id: string;
  title: string;
  description?: string;
}

export interface BusinessProfileV1 {
  name: string;
  tagline?: string;
  about?: string;
  logo?: MediaAssetV1;
  cover?: MediaAssetV1;
  /** Free-form business type string; the orchestrator maps it semantically. */
  businessType: string;
  /** Person behind the business (professional pages). Optional. */
  professionalName?: string;
  avatar?: MediaAssetV1;
  /** Human label of the profession/category, e.g. "Wedding photographer". */
  category?: string;
  /** Short display location, e.g. "Santiago, CL". */
  location?: string;
  /** Story blocks — rendered only when the source supplied them. */
  mission?: string;
  vision?: string;
  values?: string[];
  differentiators?: DifferentiatorV1[];
  /** Short trust badges supplied verbatim by the source. */
  badges?: string[];
}

export interface NormalizedContentV1 {
  version: "1";
  business: BusinessProfileV1;
  catalogs: CatalogV1[];
  gallery: MediaAssetV1[];
  team: TeamMemberV1[];
  testimonials: TestimonialV1[];
  faq: FaqEntryV1[];
  contact: ContactInfoV1;
  /** Per-source normalization notes (missing/uncertain fields). */
  issues: NormalizationIssue[];
}

export interface NormalizationIssue {
  scope: "business" | "item" | "category" | "contact" | "source";
  refId?: string;
  field?: string;
  severity: "missing" | "uncertain" | "conflict";
  message: string;
}

export function emptyNormalizedContent(name = "Untitled"): NormalizedContentV1 {
  return {
    version: "1",
    business: { name, businessType: "generic" },
    catalogs: [],
    gallery: [],
    team: [],
    testimonials: [],
    faq: [],
    contact: { socials: [] },
    issues: [],
  };
}
