/**
 * BLOCK PLANNER (V2)
 *
 * Turns the semantic structure of PageRecipeV1 plus the available content
 * into a deterministic ordered list of Power Editor blocks.
 *
 * Deterministic: ids are derived from type + index, never from uid()/Date.
 */

import type { BlockStyle, BlockType } from "@/premium-template-studio/types";
import type { PageRecipeV1 } from "../types";
import type { ContentSourceV2 } from "./content-source";
import type { PowerEditorCapabilities } from "./capabilities-v2";
import type { BlockPlanV2, RecipeSemanticsV2 } from "./types-v2";
import { resolveFrame } from "./resolvers";
import {
  resolveProfessionIcon,
  resolveProofIcon,
  resolveSemanticActionIcon,
} from "./semantic-icons";

/** Identity data the hero block needs. Supplied by the recipe, never invented. */
export interface HeroSourceV2 {
  enabled: boolean;
  name: string;
  profession: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  verified: boolean;
}

type Role = BlockPlanV2["role"];

/** Order weight per composition pattern group. Lower renders first. */
const ROLE_WEIGHT: Record<RecipeSemanticsV2["pattern"], Record<Role, number>> = {
  centered_profile: { identity: 0, navigation: 1, conversion: 2, media: 3, proof: 4, meta: 5 },
  editorial_stack: { identity: 0, meta: 1, navigation: 2, conversion: 3, media: 4, proof: 5 },
  visual_cover: { identity: 0, media: 1, conversion: 2, navigation: 3, proof: 4, meta: 5 },
  conversion_first: { identity: 0, conversion: 1, navigation: 2, proof: 3, media: 4, meta: 5 },
  portfolio_first: { identity: 0, media: 1, navigation: 2, conversion: 3, proof: 4, meta: 5 },
  service_first: { identity: 0, conversion: 1, proof: 2, navigation: 3, media: 4, meta: 5 },
  trust_first: { identity: 0, proof: 1, conversion: 2, navigation: 3, media: 4, meta: 5 },
  social_first: { identity: 0, navigation: 1, media: 2, conversion: 3, proof: 4, meta: 5 },
  compact_action: { identity: 0, conversion: 1, navigation: 2, proof: 3, media: 4, meta: 5 },
  media_story: { identity: 0, media: 1, meta: 2, conversion: 3, navigation: 4, proof: 5 },
};

function linkVariant(semantics: RecipeSemanticsV2, count: number): string {
  // Keep a large secondary action set visually quieter when a strong primary
  // CTA already exists. `list` is an existing Power Editor variant.
  if (count >= 4 && semantics.cta_pressure >= 70) return "list";
  if (semantics.surface_mood === "glass") return "glass";
  if (semantics.family === "editorial" || semantics.family === "minimal") return "list";
  if (semantics.media_weight >= 55) return "cards";
  return "stacked";
}

function ctaVariant(semantics: RecipeSemanticsV2): string {
  if (semantics.cta_pressure >= 70 && semantics.family === "energetic") return "gradient";
  if (semantics.cta_pressure >= 50) return "panel";
  return "inline";
}

const GOAL_HEADLINE: Record<string, string> = {
  whatsapp: "Hablemos ahora",
  booking: "Reserva tu cita",
  sell: "Empieza tu pedido",
  leads: "Cuéntanos tu proyecto",
  portfolio: "Trabajemos juntos",
  social: "Sígueme de cerca",
};

function baseStyle(semantics: RecipeSemanticsV2): BlockStyle {
  return semantics.visual_weight === "light" ? { shadow: "none" } : {};
}

/** exactOptionalPropertyTypes-safe: drops undefined keys entirely. */
function clean<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

function responsiveOverrides(
  type: BlockType,
  layout: BlockPlanV2["layout"],
  columnsDesktop: number,
  columnsTablet: number,
  semantics: RecipeSemanticsV2,
): NonNullable<BlockPlanV2["responsive"]> {
  const desktopColumns = Math.max(1, columnsDesktop);
  const baseSpan = Math.max(1, layout.span ?? layout.colSpan ?? 1);
  const mobile: NonNullable<BlockPlanV2["responsive"]>["mobile"] = {
    colSpan: 1,
    rowSpan: 1,
    padding: semantics.density === "compact" ? 12 : 16,
  };

  if (type === "hero") {
    mobile.ctaDirection = "column";
    mobile.avatarSize = semantics.visual_weight === "high" ? 96 : 84;
  }

  return {
    desktop: { colSpan: Math.min(baseSpan, desktopColumns) },
    tablet: { colSpan: Math.min(baseSpan, Math.max(1, columnsTablet)) },
    mobile,
  };
}

/**
 * Reading order inside a role bucket: substance first, secondary info last.
 * Unlisted types keep their insertion order in the middle of the bucket.
 */
const TYPE_RANK: Partial<Record<BlockType, number>> = {
  hero: 0,
  heading: 1,
  text: 2,
  stats: 3,
  services: 4,
  pricing: 5,
  productGrid: 6,
  portfolio: 7,
  gallery: 8,
  video: 9,
  mediaCard: 10,
  music: 11,
  testimonials: 12,
  timeline: 13,
  trust: 14,
  cta: 15,
  booking: 16,
  buttonGroup: 17,
  featuredLink: 18,
  links: 19,
  social: 20,
  events: 21,
  faq: 22,
  document: 23,
  contact: 24,
  map: 25,
  qr: 26,
  divider: 27,
  spacer: 28,
  floatingActions: 29,
};

function typeRank(type: BlockType): number {
  return TYPE_RANK[type] ?? 15;
}

/**
 * buttonGroup is a deliberate, semantic choice — never a default for links.
 * It is used for compact, action-shaped navigation: paired actions, service
 * menus and conversion-first pages, and only when no link carries an image.
 */
function wantsButtonGroup(
  semantics: RecipeSemanticsV2,
  links: { label: string; url: string; imageUrl?: string }[],
): boolean {
  if (links.length < 2 || links.length > 6) return false;
  if (links.some((l) => l.imageUrl)) return false;
  if (links.some((l) => l.label.length > 22)) return false;
  const actionPattern =
    semantics.pattern === "compact_action" ||
    semantics.pattern === "conversion_first" ||
    semantics.pattern === "service_first";
  const compactCreator = semantics.family === "creator" && semantics.density === "compact";
  return actionPattern || compactCreator;
}

/** Even counts >= 2 => two columns: 2 => 1x2, 4 => 2x2, 6 => 3x2. Odd => one column. */
function buttonGroupColumns(count: number): 1 | 2 {
  return count >= 2 && count % 2 === 0 ? 2 : 1;
}

/** 75/25 media cards suit portfolio / service / product content only. */
function wantsMediaLinkCards(semantics: RecipeSemanticsV2): boolean {
  if (semantics.media_strategy === "minimal-no-media") return false;
  if (semantics.family === "minimal" || semantics.family === "corporate") {
    return semantics.media_strategy === "media-cards";
  }
  return (
    semantics.media_strategy === "media-cards" ||
    semantics.media_weight >= 60 ||
    semantics.pattern === "portfolio_first" ||
    semantics.pattern === "service_first" ||
    semantics.pattern === "media_story"
  );
}

/** A strategy controls which major media story is actually planned. */
function mediaBlockAllowed(
  strategy: RecipeSemanticsV2["media_strategy"],
  type: BlockType,
): boolean {
  if (strategy === "minimal-no-media") return false;
  if (strategy === "video-first") return type === "video";
  if (strategy === "gallery-first") return type === "gallery";
  if (strategy === "portfolio-first") return type === "portfolio";
  if (strategy === "media-cards") return type === "mediaCard";
  return true;
}

/** Media-led strategies move their chosen story ahead of conversion. */
function strategyRank(strategy: RecipeSemanticsV2["media_strategy"], type: BlockType): number {
  const first: Partial<Record<RecipeSemanticsV2["media_strategy"], BlockType[]>> = {
    "video-first": ["video"],
    "gallery-first": ["gallery"],
    "portfolio-first": ["portfolio"],
    "media-cards": ["links", "mediaCard"],
  };
  return first[strategy]?.includes(type) ? 0 : 1;
}

export function planBlocks(
  recipe: PageRecipeV1,
  semantics: RecipeSemanticsV2,
  content: ContentSourceV2,
  capabilities: PowerEditorCapabilities,
  columnsDesktop: number,
  hero: HeroSourceV2,
  columnsTablet = columnsDesktop > 1 ? 2 : 1,
): BlockPlanV2[] {
  const planned: Omit<BlockPlanV2, "id" | "order">[] = [];
  const style = baseStyle(semantics);
  const span = columnsDesktop > 1 ? 1 : 2;

  const push = (
    type: BlockType,
    variant: string,
    role: Role,
    contentValue: Record<string, unknown>,
    layout: BlockPlanV2["layout"] = {},
    emphasis: "primary" | "secondary" = "secondary",
  ) => {
    const frame = resolveFrame(semantics, emphasis, capabilities);
    const blockLayout = { width: "content" as const, align: "center" as const, span: 2, ...layout };
    planned.push({
      type,
      variant,
      role,
      style: frame === "none" ? style : { ...style, frame },
      layout: blockLayout,
      visibility: { desktop: true, tablet: true, mobile: true },
      animation: semantics.family === "minimal" ? "fade" : "soft-rise",
      motion: capabilities.motion_per_block
        ? { useGlobal: true }
        : { useGlobal: false, disableMotion: true },
      frame,
      responsive: responsiveOverrides(type, blockLayout, columnsDesktop, columnsTablet, semantics),
      content: clean(contentValue) as BlockPlanV2["content"],
    });
  };

  /* ------------------------------------------------------- identity */
  if (hero.enabled && capabilities.block_hero) {
    const heroVariant =
      semantics.pattern === "media_story"
        ? "full-image"
        : semantics.family === "editorial"
          ? "editorial"
          : columnsDesktop > 1
            ? "split"
            : "centered";
    push(
      "hero",
      heroVariant,
      "identity",
      {
        eyebrow: hero.profession,
        title: hero.name,
        subtitle: hero.profession,
        description: hero.bio,
        avatar: hero.avatarUrl
          ? clean({
              url: hero.avatarUrl,
              size: semantics.visual_weight === "high" ? 112 : 96,
              radius: 9999,
              borderWidth: semantics.family === "minimal" ? 0 : 3,
              shadow: semantics.family === "minimal" ? "none" : "soft",
              overlap: 44,
            })
          : undefined,
        bannerImage: hero.bannerUrl ? { url: hero.bannerUrl, blur: 0 } : undefined,
        badge: hero.verified ? { enabled: true, label: hero.profession || "Verified" } : undefined,
        primaryCTA: {
          enabled: true,
          label: recipe.conversion.primary_cta.label,
          url: recipe.conversion.primary_cta.destination,
        },
        ctaDirection: semantics.density === "compact" ? "row" : "column",
      },
      { width: "full", span: 2 },
      "primary",
    );
  }

  if (content.about && semantics.family !== "energetic") {
    push("text", semantics.family === "editorial" ? "quote" : "default", "identity", {
      body: content.about,
    });
  }

  /* --------------------------------------------------------- proof */
  if (content.badges && capabilities.block_trust) {
    push(
      "trust",
      semantics.visual_weight === "high" ? "cards" : "row",
      "proof",
      {
        badges: content.badges.map((b, i) =>
          clean({
            id: `bdg-${i}`,
            label: b.label,
            icon: b.icon ?? resolveProofIcon(b.label, semantics.family, i),
          }),
        ),
      },
      {},
      semantics.trust >= 65 ? "primary" : "secondary",
    );
  }

  /* ---------------------------------------------------- conversion */
  const cta = recipe.conversion.primary_cta;
  const ctaKind = ctaVariant(semantics);
  push(
    "cta",
    ctaKind,
    "conversion",
    {
      // The panel headline is semantic, never a copy of the button label.
      title: ctaKind === "inline" ? undefined : GOAL_HEADLINE[recipe.conversion.primary_goal],
      label: cta.label,
      url: cta.destination,
    },
    {},
    "primary",
  );

  /* ---------------------------------------------------- navigation */
  if (content.featured) {
    const useFeaturedMedia =
      capabilities.block_featuredMedia && semantics.media_strategy === "immersive-background";
    if (useFeaturedMedia) {
      push(
        "featuredMedia",
        semantics.media_weight >= 70 ? "hero-media" : semantics.surface_mood === "glass" ? "split" : "card",
        "media",
        {
          mediaType: "image",
          imageUrl: content.featured.imageUrl,
          title: content.featured.title,
          description: content.featured.subtitle,
          ctaLabel: "Ver más",
          ctaUrl: content.featured.url,
        },
        { span },
        "primary",
      );
    } else if (
      capabilities.block_featuredLink &&
      mediaBlockAllowed(semantics.media_strategy, "featuredLink")
    ) {
      push(
        "featuredLink",
        semantics.media_weight >= 55 ? "cover" : "side",
        "navigation",
        {
          title: content.featured.title,
          subtitle: content.featured.subtitle,
          url: content.featured.url,
          imageUrl: content.featured.imageUrl,
        },
        {},
        "primary",
      );
    }
  }
  if (content.links) {
    const links = content.links;
    if (capabilities.block_buttonGroup && wantsButtonGroup(semantics, links)) {
      const columns = buttonGroupColumns(links.length);
      push(
        "buttonGroup",
        columns === 2 ? "row" : "split",
        "navigation",
        {
            items: links.map((l, i) => ({
              id: `btn-${i}`,
              label: l.label,
              url: l.url,
              newTab: true,
            })),
        },
        { columns, gap: 10 },
      );
    } else {
      const variant = linkVariant(semantics, links.length);
      const mediaCards = wantsMediaLinkCards(semantics);
      push("links", variant, "navigation", {
        items: links.map((l, i) => {
          // No image => graceful fallback to card / plain button. Never invented.
          const presentation: "button" | "card" | "media-card" =
            mediaCards && l.imageUrl ? "media-card" : variant === "cards" ? "card" : "button";
          return clean({
            id: `link-${i}`,
            label: l.label,
            url: l.url,
            description: l.description,
            imageUrl: presentation === "media-card" ? l.imageUrl : undefined,
            presentation,
            mediaPosition:
              presentation === "media-card" ? (i % 2 === 0 ? "left" : "right") : undefined,
            newTab: true,
          });
        }),
      });
    }
  }
  if (content.socials && recipe.structure.social_row.enabled) {
    push("social", semantics.family === "luxury" ? "outline" : "icons", "navigation", {
      socials: content.socials.map((s, i) => ({ id: `soc-${i}`, platform: s.platform, url: s.url })),
    });
  }

  /* --------------------------------------------------------- media */
  if (
    content.image &&
    capabilities.block_image &&
    mediaBlockAllowed(semantics.media_strategy, "image")
  ) {
    push(
      "image",
      semantics.family === "minimal" ? "plain" : semantics.media_weight >= 60 ? "full" : "framed",
      "media",
      { imageUrl: content.image.url, alt: content.image.alt },
      { span, aspect: semantics.media_weight >= 60 ? "auto" : "portrait" },
    );
  }

  if (
    content.portfolio &&
    capabilities.block_portfolio &&
    mediaBlockAllowed(semantics.media_strategy, "portfolio")
  ) {
    push(
      "portfolio",
      semantics.surface_mood === "flat" ? "grid" : "cards",
      "media",
      {
        title: "Selected work",
        items: content.portfolio.map((p, i) =>
          clean({
            id: `pf-${i}`,
            label: p.label,
            description: p.description,
            url: p.url,
            imageUrl: p.imageUrl,
          }),
        ),
      },
      { columns: 2, gap: 10 },
    );
  }
  if (
    content.gallery &&
    capabilities.block_gallery &&
    mediaBlockAllowed(semantics.media_strategy, "gallery")
  ) {
    push(
      "gallery",
      semantics.media_strategy === "gallery-first" || semantics.family === "creator"
        ? "mosaic"
        : "grid",
      "media",
      { images: content.gallery.map((g, i) => clean({ id: `img-${i}`, url: g.url, alt: g.alt })) },
      { columns: 3, gap: 8 },
    );
  }
  if (
    content.video &&
    capabilities.block_video &&
    mediaBlockAllowed(semantics.media_strategy, "video")
  ) {
    push(
      "video",
      "embed",
      "media",
      { title: content.video.title, provider: content.video.provider, videoId: content.video.videoId },
      { span, aspect: "video" },
    );
  }
  if (
    content.mediaCard &&
    capabilities.block_mediaCard &&
    mediaBlockAllowed(semantics.media_strategy, "mediaCard")
  ) {
    push(
      "mediaCard",
      columnsDesktop > 1 ? "cover" : "row",
      "media",
      {
        title: content.mediaCard.title,
        body: content.mediaCard.body,
        imageUrl: content.mediaCard.imageUrl,
        url: content.mediaCard.url,
      },
      { span },
    );
  }

  /* ---------------------------------------------------------- meta */
  if (content.document && capabilities.block_document) {
    push("document", semantics.visual_weight === "light" ? "row" : "card", "meta", {
      title: content.document.title,
      fileName: content.document.fileName,
      fileSize: content.document.fileSize,
      url: content.document.url,
    });
  }
  if (content.contact && capabilities.block_contact) {
    push("contact", semantics.family === "corporate" ? "card" : "list", "meta", {
      title: "Contact",
      email: content.contact.email,
      phone: content.contact.phone,
      address: content.contact.address,
    });
  }
  if (
    content.qrUrl &&
    capabilities.block_qr &&
    semantics.family !== "minimal" &&
    semantics.media_strategy !== "minimal-no-media"
  ) {
    push("qr", "card", "meta", { title: "Scan profile", url: content.qrUrl }, { span });
  }

  /* ------------------------------------------------- V2 premium blocks */
  if (content.stats && capabilities.block_stats) {
    push(
      "stats",
      semantics.surface_mood === "glass"
        ? "glass"
        : semantics.visual_weight === "high"
          ? "highlight"
          : semantics.family === "minimal"
            ? "minimal"
            : "cards",
      "proof",
      {
        items: content.stats.map((s, i) =>
          clean({ id: `stat-${i}`, value: s.value, label: s.label, icon: s.icon }),
        ),
      },
      { columns: Math.min(content.stats.length, 3), gap: 10 },
    );
  }

  if (content.services && capabilities.block_services) {
    push(
      "services",
      semantics.media_weight >= 60
        ? "image"
        : semantics.density === "compact"
          ? "compact"
          : semantics.family === "minimal"
            ? "minimal"
            : "cards",
      "conversion",
      {
        title: "Servicios",
        items: content.services.map((s, i) =>
          clean({
            id: `srv-${i}`,
            title: s.title,
            description: s.description,
            price: s.price,
            icon: s.icon ?? resolveProfessionIcon(recipe.identity.profession, semantics.family, i),
            imageUrl: s.imageUrl,
          }),
        ),
      },
      { columns: columnsDesktop > 1 ? 2 : 1, gap: 10 },
    );
  }

  if (content.pricing && capabilities.block_pricing) {
    push(
      "pricing",
      content.pricing.some((p) => p.recommended)
        ? "featured"
        : semantics.density === "compact"
          ? "compact"
          : "cards",
      "conversion",
      {
        items: content.pricing.map((p, i) =>
          clean({
            id: `prc-${i}`,
            title: p.title,
            price: p.price,
            period: p.period,
            description: p.description,
            features: p.features,
            recommended: p.recommended,
            ctaLabel: p.ctaLabel,
            ctaUrl: p.ctaUrl,
          }),
        ),
      },
      { columns: Math.min(content.pricing.length, columnsDesktop > 1 ? 2 : 1), gap: 12 },
      "primary",
    );
  }

  if (content.testimonials && capabilities.block_testimonials) {
    push(
      "testimonials",
      semantics.trust >= 65
        ? "featured"
        : semantics.family === "editorial"
          ? "quote"
          : semantics.density === "compact"
            ? "compact"
            : "cards",
      "proof",
      {
        items: content.testimonials.map((t, i) =>
          clean({
            id: `tst-${i}`,
            name: t.name,
            quote: t.quote,
            role: t.role,
            source: t.source,
            rating: t.rating,
            avatarUrl: t.avatarUrl,
          }),
        ),
      },
      { columns: columnsDesktop > 1 ? 2 : 1, gap: 10 },
    );
  }

  if (content.timeline && capabilities.block_timeline) {
    push("timeline", semantics.family === "editorial" ? "editorial" : semantics.visual_weight === "high" ? "cards" : "minimal", "proof", {
      items: content.timeline.map((t, i) =>
        clean({ id: `tml-${i}`, title: t.title, date: t.date, description: t.description, icon: t.icon }),
      ),
    });
  }

  if (content.faq && capabilities.block_faq) {
    push("faq", "default", "meta", {
      title: "Preguntas frecuentes",
      behavior: { allowMultipleOpen: false },
      items: content.faq.map((f, i) => ({ id: `faq-${i}`, question: f.question, answer: f.answer })),
    });
  }

  if (
    content.products?.length === 1 &&
    capabilities.block_product &&
    mediaBlockAllowed(semantics.media_strategy, "product")
  ) {
    const product = content.products[0]!;
    push(
      "product",
      semantics.primary_goal === "sell"
        ? "featured"
        : semantics.media_weight >= 60
          ? "image-first"
          : semantics.family === "minimal"
            ? "minimal"
            : "card",
      "conversion",
      {
        title: product.title,
        price: product.price,
        comparePrice: product.comparePrice,
        description: product.description,
        imageUrl: product.imageUrl,
        ctaLabel: product.ctaLabel,
        ctaUrl: product.ctaUrl,
      },
      { span },
      "primary",
    );
  }

  if (
    content.products &&
    content.products.length > 1 &&
    capabilities.block_productGrid &&
    mediaBlockAllowed(semantics.media_strategy, "productGrid")
  ) {
    push(
      "productGrid",
      semantics.family === "minimal" ? "minimal" : "cards",
      "media",
      {
        items: content.products.map((p, i) =>
          clean({
            id: `prd-${i}`,
            title: p.title,
            price: p.price,
            comparePrice: p.comparePrice,
            description: p.description,
            imageUrl: p.imageUrl,
            ctaLabel: p.ctaLabel,
            ctaUrl: p.ctaUrl,
          }),
        ),
      },
      { columns: columnsDesktop > 1 ? 2 : 1, gap: 10 },
    );
  }

  if (content.events && capabilities.block_events) {
    push("events", semantics.media_weight >= 55 ? "cards" : "list", "meta", {
      title: "Agenda",
      items: content.events.map((e, i) =>
        clean({
          id: `evt-${i}`,
          title: e.title,
          date: e.date,
          time: e.time,
          location: e.location,
          ctaLabel: e.ctaLabel,
          ctaUrl: e.ctaUrl,
          imageUrl: e.imageUrl,
        }),
      ),
    });
  }

  if (
    content.music &&
    capabilities.block_music &&
    mediaBlockAllowed(semantics.media_strategy, "music")
  ) {
    push("music", semantics.visual_weight === "high" ? "featured" : "card", "media", {
      title: content.music.title,
      artist: content.music.artist,
      coverUrl: content.music.coverUrl,
      audioUrl: content.music.audioUrl,
    });
  }

  if (content.map && capabilities.block_map) {
    push("map", "default", "meta", {
      title: content.map.label ?? "Ubicación",
      location: clean({ lat: content.map.lat, lng: content.map.lng, label: content.map.label }),
    });
  }

  if (content.bookingUrl && capabilities.block_booking) {
    push("booking", "default", "conversion", {
      title: "Reserva tu cita",
      bookingUrl: content.bookingUrl,
      ctaLabel: recipe.conversion.primary_cta.label,
    });
  }

  /* Floating quick actions: only when the CTA pressure justifies them. */
  if (
    content.quickActions &&
    capabilities.block_floatingActions &&
    capabilities.block_floating &&
    semantics.cta_pressure >= 55
  ) {
    push(
      "floatingActions",
      "default",
      "conversion",
      {
        items: content.quickActions.map((a, i) =>
          clean({
            id: `fla-${i}`,
            label: a.label,
            url: a.url,
            icon: a.icon ?? resolveSemanticActionIcon(a),
          }),
        ),
      },
      {
        width: "full",
        span: 2,
        floating: { enabled: true, anchor: "bottom-right", offset: 20 },
        zIndex: 40,
      },
    );
  }

  /**
   * Sticky is applied to at most ONE small, high-intent action block, and
   * never together with a floating block (that pair would overlap).
   */
  const hasFloating = planned.some((b) => b.layout.floating?.enabled === true);
  if (
    capabilities.block_sticky &&
    !hasFloating &&
    semantics.cta_pressure >= 70 &&
    (semantics.pattern === "conversion_first" ||
      semantics.pattern === "compact_action" ||
      semantics.pattern === "service_first")
  ) {
    const target =
      planned.find((b) => b.type === "booking") ??
      planned.find((b) => b.type === "cta") ??
      planned.find((b) => b.type === "buttonGroup");
    if (target) target.layout = { ...target.layout, sticky: { enabled: true, top: 12 }, zIndex: 20 };
  }

  const weight = ROLE_WEIGHT[semantics.pattern];
  return planned
    .map((block, index) => ({ block, index }))
    .sort((a, b) => {
      const strategyDiff =
        strategyRank(semantics.media_strategy, a.block.type) -
        strategyRank(semantics.media_strategy, b.block.type);
      if (strategyDiff !== 0) return strategyDiff;
      const diff = weight[a.block.role] - weight[b.block.role];
      if (diff !== 0) return diff;
      const typeDiff = typeRank(a.block.type) - typeRank(b.block.type);
      return typeDiff !== 0 ? typeDiff : a.index - b.index;
    })
    .sort((a, b) => Number(b.block.type === "hero") - Number(a.block.type === "hero"))
    .map(({ block }, order) => ({ ...block, id: `${block.type}-${order}`, order }));
}
