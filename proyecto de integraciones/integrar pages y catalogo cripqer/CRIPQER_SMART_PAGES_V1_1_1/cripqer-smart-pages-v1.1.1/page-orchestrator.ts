/**
 * CRIPQER SMART PAGES V1 — Page Orchestrator.
 *
 * Decides WHAT structural experience to build. It is deterministic, pure and
 * network-free. It carries NO visual design decisions — Engine V2 remains the
 * visual brain.
 */

import type { CatalogV1, NormalizedContentV1, SalesActionV1 } from "./catalog.types";
import { resolvePreset, type SemanticPreset } from "./business-presets";
import type { NavItemV1 } from "./ecosystem";
import { actionHref, defaultLabel } from "./sales-actions";
import {
  DEFAULT_RUNTIME_THEME,
  type ContentCapabilitiesV1,
  type ExperienceType,
  type HeroVariant,
  type MiniSitePlanV1,
  type PageGenerationRequest,
  type PagePlanV1,
  type RuntimePageConfigV1,
  type SectionKind,
  type SectionPlanV1,
} from "./smart-pages.types";
import { slugify } from "./content-normalizer";

/* ------------------------------------------------------------ capabilities */

export function deriveCapabilities(content: NormalizedContentV1): ContentCapabilitiesV1 {
  const items = content.catalogs.flatMap((c) => c.items);
  return {
    hasCatalog: items.length > 0,
    hasCategories: content.catalogs.some((c) => c.categories.length > 1),
    hasPrices: items.some((i) => i.price !== undefined),
    hasMedia: content.gallery.length > 0 || items.some((i) => i.media.length > 0),
    hasTeam: content.team.length > 0,
    hasTestimonials: content.testimonials.length > 0,
    hasFaq: content.faq.length > 0,
    hasLocation: Boolean(content.contact.address ?? content.contact.mapUrl),
    hasBooking: Boolean(content.contact.bookingUrl),
    hasWhatsapp: Boolean(content.contact.whatsapp),
  };
}

const CATALOG_KIND_BY_EXPERIENCE: Record<ExperienceType, CatalogV1["kind"] | null> = {
  catalog: "catalog",
  menu: "menu",
  services: "services",
  portfolio: "portfolio",
  listings: "listings",
  landing: null,
};

function pickCatalog(
  content: NormalizedContentV1,
  experience: ExperienceType,
): CatalogV1 | undefined {
  const wanted = CATALOG_KIND_BY_EXPERIENCE[experience];
  if (wanted) {
    const match = content.catalogs.find((c) => c.kind === wanted && c.items.length > 0);
    if (match) return match;
  }
  return content.catalogs.find((c) => c.items.length > 0);
}

function experienceFromCatalog(kind: CatalogV1["kind"]): ExperienceType {
  switch (kind) {
    case "menu":
      return "menu";
    case "portfolio":
      return "portfolio";
    case "listings":
      return "listings";
    case "services":
      return "services";
    default:
      return "catalog";
  }
}

export function resolveExperienceType(
  request: PageGenerationRequest,
  preset: SemanticPreset,
  caps: ContentCapabilitiesV1,
): ExperienceType {
  if (request.preferences?.experienceType) return request.preferences.experienceType;
  if (!caps.hasCatalog) return "landing";
  const primary = request.content.catalogs.find((c) => c.items.length > 0);
  // Content wins over the preset when the two disagree: we never render a menu
  // experience for a catalog that has no menu items.
  if (primary && CATALOG_KIND_BY_EXPERIENCE[preset.experienceType] !== primary.kind) {
    return experienceFromCatalog(primary.kind);
  }
  return preset.experienceType;
}

/* -------------------------------------------------------------- section map */

const GRID_BY_EXPERIENCE: Record<ExperienceType, SectionKind> = {
  catalog: "productGrid",
  services: "serviceGrid",
  portfolio: "portfolioGrid",
  menu: "menuSections",
  listings: "listingGrid",
  landing: "serviceGrid",
};

const DENSITY_DROP: Record<string, SectionKind[]> = {
  minimal: ["faq", "testimonials", "team", "gallery", "about", "pricing", "search", "filterBar"],
  balanced: [],
  rich: [],
};

function sectionAvailable(
  kind: SectionKind,
  content: NormalizedContentV1,
  caps: ContentCapabilitiesV1,
  catalog: CatalogV1 | undefined,
  request: PageGenerationRequest,
): boolean {
  switch (kind) {
    case "hero":
    case "footer":
      return true;
    case "about":
      return Boolean(content.business.about);
    case "missionVision":
      return Boolean(
        content.business.mission ??
        content.business.vision ??
        (content.business.values?.length ?? 0) > 0,
      );
    case "whyUs":
      return (content.business.differentiators?.length ?? 0) > 0;
    case "categoryNav":
      return (catalog?.categories.length ?? 0) > 1;
    case "search":
      return request.preferences?.showSearch ?? (catalog?.items.length ?? 0) >= 8;
    case "filterBar":
      return (
        (request.preferences?.showFilters ?? false) ||
        (catalog?.items.some((i) => i.attributes.length > 0) ?? false)
      );
    case "featured":
      return catalog?.items.some((i) => i.featured) ?? false;
    case "productGrid":
    case "serviceGrid":
    case "portfolioGrid":
    case "menuSections":
    case "listingGrid":
      return (catalog?.items.length ?? 0) > 0;
    case "gallery":
      return content.gallery.length > 0;
    case "pricing":
      return caps.hasPrices && (catalog?.items.length ?? 0) > 0;
    case "team":
      return caps.hasTeam;
    case "testimonials":
      return caps.hasTestimonials;
    case "faq":
      return caps.hasFaq;
    case "location":
      return caps.hasLocation;
    case "contact":
      return Boolean(content.contact.email ?? content.contact.phone ?? content.contact.address);
    case "whatsappCta":
      return caps.hasWhatsapp;
    case "bookingCta":
      return caps.hasBooking;
    case "quoteCta":
      return Boolean(content.contact.email ?? content.contact.whatsapp);
    default:
      return false;
  }
}

function withGrid(sequence: SectionKind[], experience: ExperienceType): SectionKind[] {
  const grid = GRID_BY_EXPERIENCE[experience];
  const grids: SectionKind[] = [
    "productGrid",
    "serviceGrid",
    "portfolioGrid",
    "menuSections",
    "listingGrid",
  ];
  let replaced = false;
  const out: SectionKind[] = [];
  for (const kind of sequence) {
    if (grids.includes(kind)) {
      if (!replaced) {
        out.push(grid);
        replaced = true;
      }
      continue;
    }
    out.push(kind);
  }
  if (!replaced) out.splice(1, 0, grid);
  return out;
}

/** Story blocks sit right after About when the source supplied them. */
function withStorySections(sequence: SectionKind[]): SectionKind[] {
  const out: SectionKind[] = [];
  let inserted = false;
  for (const kind of sequence) {
    out.push(kind);
    if (kind === "about" && !inserted) {
      out.push("missionVision", "whyUs");
      inserted = true;
    }
  }
  if (!inserted) out.splice(1, 0, "missionVision", "whyUs");
  return out;
}

/* ---------------------------------------------------------------- CTA logic */

function resolveCtas(
  request: PageGenerationRequest,
  content: NormalizedContentV1,
  preset: SemanticPreset,
): { primary: SalesActionV1; secondary: SalesActionV1[] } {
  const ctx = {
    businessName: content.business.name,
    ...(content.contact.phone ? { contactPhone: content.contact.phone } : {}),
    ...(content.contact.email ? { contactEmail: content.contact.email } : {}),
    ...(content.contact.whatsapp ? { contactWhatsapp: content.contact.whatsapp } : {}),
    ...(content.contact.bookingUrl ? { bookingUrl: content.contact.bookingUrl } : {}),
  };
  const usable = (a: SalesActionV1 | undefined): a is SalesActionV1 =>
    Boolean(a && a.enabled && a.kind !== "checkout" && actionHref(a, ctx));

  const fromKind = (kind: SalesActionV1["kind"]): SalesActionV1 => ({
    kind,
    label: defaultLabel(kind),
    enabled: true,
  });

  // 1. explicit user/request CTAs win.
  const secondary = request.secondaryActions.filter(usable);
  let primary: SalesActionV1 | undefined = usable(request.primaryAction)
    ? request.primaryAction
    : undefined;

  // 2. semantic preset recommendation.
  if (!primary) {
    const presetPrimary = fromKind(preset.primaryActionKind);
    if (usable(presetPrimary)) primary = presetPrimary;
  }
  if (!primary) primary = secondary.shift();
  if (!primary) {
    for (const kind of preset.secondaryActionKinds) {
      const candidate = fromKind(kind);
      if (usable(candidate)) {
        primary = candidate;
        break;
      }
    }
  }
  // 3. safe generic contact action (enabled only when it truly resolves).
  const resolvedPrimary: SalesActionV1 = primary ?? {
    kind: "contact",
    label: defaultLabel("contact"),
    enabled: false,
  };

  // Preset secondaries enrich, never override, the explicit ones.
  const merged = [...secondary];
  for (const kind of preset.secondaryActionKinds) {
    if (merged.length >= 3) break;
    if (kind === resolvedPrimary.kind || merged.some((a) => a.kind === kind)) continue;
    const candidate = fromKind(kind);
    if (usable(candidate)) merged.push(candidate);
  }

  return {
    primary: resolvedPrimary,
    secondary: merged.filter((a) => a.kind !== resolvedPrimary.kind).slice(0, 2),
  };
}

const NAV_LABELS: Partial<Record<SectionKind, string>> = {
  productGrid: "Catalog",
  serviceGrid: "Services",
  portfolioGrid: "Portfolio",
  menuSections: "Menu",
  listingGrid: "Listings",
  gallery: "Gallery",
  about: "About",
  missionVision: "Mission",
  whyUs: "Why us",
  team: "Team",
  testimonials: "Reviews",
  pricing: "Prices",
  faq: "FAQ",
  location: "Location",
  contact: "Contact",
};

function buildNavigation(sections: SectionPlanV1[]): NavItemV1[] {
  const items: NavItemV1[] = [];
  for (const section of sections) {
    const label = NAV_LABELS[section.kind];
    if (!label || items.some((i) => i.label === label)) continue;
    items.push({
      id: `nav_${section.id}`,
      label,
      destination: { mode: "section", sectionId: section.id },
    });
    if (items.length >= 6) break;
  }
  return items;
}

function pickHeroVariant(
  request: PageGenerationRequest,
  experience: ExperienceType,
  content: NormalizedContentV1,
): HeroVariant {
  if (content.business.cover) return experience === "portfolio" ? "media" : "split";
  if (content.business.avatar ?? content.business.professionalName) return "compact";
  if (request.density === "minimal") return "compact";
  return "centered";
}

/* ------------------------------------------------------------- orchestrator */

export function generatePagePlan(request: PageGenerationRequest): PagePlanV1 {
  const content = request.content;
  const caps = { ...deriveCapabilities(content), ...(request.contentCapabilities ?? {}) };
  const preset = resolvePreset(request.businessType);
  const experienceType = resolveExperienceType(request, preset, caps);
  const catalog = pickCatalog(content, experienceType);
  const drop = DENSITY_DROP[request.density] ?? [];

  const enriched = withStorySections(withGrid(preset.sequence, experienceType));
  const sequence = enriched.filter(
    (kind) => !drop.includes(kind) && sectionAvailable(kind, content, caps, catalog, request),
  );

  const gridKind = GRID_BY_EXPERIENCE[experienceType];
  const sections: SectionPlanV1[] = sequence.map((kind, order) => {
    const section: SectionPlanV1 = { id: `sec_${kind}_${order}`, kind, order };
    const title = sectionTitle(kind, preset.catalogTitle);
    if (title) section.title = title;
    if (kind === gridKind || kind === "featured" || kind === "categoryNav" || kind === "pricing") {
      const binding: SectionPlanV1["binding"] = {};
      if (catalog) binding.catalogId = catalog.id;
      if (kind === "featured") {
        binding.featuredOnly = true;
        binding.limit = 6;
      }
      section.binding = binding;
    }
    return section;
  });

  const ctas = resolveCtas(request, content, preset);
  const itemCount = catalog?.items.length ?? 0;

  return {
    version: "1",
    pageId: `page_${slugify(content.business.name) || "home"}`,
    title: content.business.name,
    slug: slugify(content.business.name) || "home",
    experienceType,
    sections,
    ctaHierarchy: ctas,
    navigation: buildNavigation(sections),
    heroVariant: pickHeroVariant(request, experienceType, content),
    runtimeRequirements: {
      needsSearch: sections.some((s) => s.kind === "search"),
      needsFilters: sections.some((s) => s.kind === "filterBar"),
      needsDetailView: itemCount > 0,
      needsCategoryNav: sections.some((s) => s.kind === "categoryNav"),
      checkoutEnabled: false,
    },
  };
}

function sectionTitle(kind: SectionKind, catalogTitle: string): string | undefined {
  switch (kind) {
    case "productGrid":
    case "serviceGrid":
    case "portfolioGrid":
    case "menuSections":
    case "listingGrid":
      return catalogTitle;
    case "featured":
      return "Featured";
    case "gallery":
      return "Gallery";
    case "pricing":
      return "Prices";
    case "team":
      return "Team";
    case "testimonials":
      return "What clients say";
    case "faq":
      return "Frequently asked questions";
    case "about":
      return "About us";
    case "missionVision":
      return "Mission & vision";
    case "whyUs":
      return "Why choose us";
    case "location":
      return "Where to find us";
    case "contact":
      return "Contact";
    default:
      return undefined;
  }
}

/**
 * Small structured mini-site — real support for 1..5 pages, never a CMS.
 * Pages are only created when the content for them actually exists, so the
 * reported page count is always truthful.
 */
export function generateMiniSitePlan(request: PageGenerationRequest): MiniSitePlanV1 {
  const home = generatePagePlan(request);
  const maxPages = Math.max(1, Math.min(request.preferences?.maxPages ?? 1, 5));

  const groups: Array<{ kinds: SectionKind[]; title: string; slug: string }> = [
    {
      kinds: [
        "categoryNav",
        "search",
        "filterBar",
        "featured",
        "productGrid",
        "serviceGrid",
        "menuSections",
        "listingGrid",
        "pricing",
      ],
      title: "Catalog",
      slug: "catalog",
    },
    { kinds: ["portfolioGrid", "gallery"], title: "Portfolio", slug: "portfolio" },
    { kinds: ["about", "missionVision", "whyUs", "team"], title: "About", slug: "about" },
    { kinds: ["testimonials", "faq"], title: "Reviews", slug: "reviews" },
    {
      kinds: ["contact", "location", "whatsappCta", "quoteCta", "bookingCta"],
      title: "Contact",
      slug: "contact",
    },
  ];

  const pages: PagePlanV1[] = [home];
  const claimed = new Set<SectionKind>();

  if (maxPages > 1) {
    for (const group of groups) {
      if (pages.length >= maxPages) break;
      const sections = home.sections.filter(
        (s) => group.kinds.includes(s.kind) && !claimed.has(s.kind),
      );
      if (sections.length === 0) continue;
      for (const s of sections) claimed.add(s.kind);
      const body = sections.map((s, i) => ({ ...s, order: i + 1 }));
      pages.push({
        ...home,
        pageId: `page_${group.slug}`,
        title: group.title,
        slug: group.slug,
        navigation: [],
        heroVariant: "compact",
        sections: [
          { id: `sec_hero_${group.slug}`, kind: "hero", order: 0, title: group.title },
          ...body,
          { id: `sec_footer_${group.slug}`, kind: "footer" as SectionKind, order: body.length + 1 },
        ],
      });
    }

    // Home keeps a lighter shape when spin-off pages exist.
    if (pages.length > 1) {
      const keptHome = home.sections.filter((s) => !claimed.has(s.kind));
      home.sections = keptHome.map((s, i) => ({ ...s, order: i }));
    }
  }

  // Cross-page navigation for every page (internal_page destinations).
  const siteNav: NavItemV1[] = pages.map((p) => ({
    id: `nav_${p.pageId}`,
    label: p.pageId === home.pageId ? "Home" : p.title,
    destination: { mode: "internal_page", pageId: p.pageId },
  }));
  for (const page of pages) {
    page.navigation = pages.length > 1 ? siteNav : buildNavigation(page.sections);
  }

  const business: MiniSitePlanV1["business"] = {
    name: request.content.business.name,
    businessType: request.businessType,
  };
  if (request.content.business.tagline) business.tagline = request.content.business.tagline;

  return {
    version: "1",
    projectId: `site_${home.slug}`,
    business,
    navigation: pages.map((p) => ({ pageId: p.pageId, label: p.title, slug: p.slug })),
    pages,
  };
}

export function buildRuntimeConfig(
  plan: PagePlanV1,
  content: NormalizedContentV1,
  theme?: Partial<RuntimePageConfigV1["theme"]>,
): RuntimePageConfigV1 {
  return {
    version: "1",
    plan,
    content,
    theme: { ...DEFAULT_RUNTIME_THEME, ...(theme ?? {}) },
    checkoutEnabled: false,
  };
}
