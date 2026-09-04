import type { BioTemplateConfig, TemplateBlock, TemplateDefinition } from "../types";
import { buildTemplate } from "../engine/TemplateBuilder";
import { getLayout } from "../constants/layouts";
import { getTheme } from "../constants/themes";

/** Deterministic ids: demo configs must render identically on server and client. */
let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}
function resetIds(seed: number): void {
  seq = seed;
}

/**
 * TEMPLATE EXTENSION POINT
 * A template definition is *data*: base blocks + layout id + theme id.
 * Three visually unrelated experiences below share the exact same React
 * components — nothing is duplicated. See docs/TEMPLATE_ENGINE.md.
 */

const IMG = {
  bannerCreator:
    "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1600&q=70",
  bannerExec:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=70",
  bannerBento:
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=70",
  avatarSofia:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=70",
  avatarExec:
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=70",
  work1:
    "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=800&q=70",
  work2:
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=70",
  work3:
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=70",
  studio:
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=70",
  gallery1:
    "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=600&q=70",
  gallery2:
    "https://images.unsplash.com/photo-1517840901100-8179e982acb7?auto=format&fit=crop&w=600&q=70",
  gallery3:
    "https://images.unsplash.com/photo-1526779259212-939e64788e3c?auto=format&fit=crop&w=600&q=70",
};

function block(
  type: TemplateBlock["type"],
  variant: string,
  content: TemplateBlock["content"],
  layout: TemplateBlock["layout"] = {},
  style: TemplateBlock["style"] = {},
): TemplateBlock {
  return {
    id: nextId("block"),
    type,
    variant,
    content,
    style,
    layout: { width: "content", align: "center", span: 2, ...layout },
    visibility: { desktop: true, tablet: true, mobile: true },
    interaction: { animation: "soft-rise", newTab: true },
  };
}

/* ------------------------------------------------------------------ */
/* 001 — Creator Premium                                               */
/* ------------------------------------------------------------------ */

function creatorPremium(): BioTemplateConfig {
  resetIds(1000);
  return buildTemplate({
    pageInstanceId: "creator-premium-001-demo",
    templateDefinitionId: "creator-premium-001",
    name: "Creator Premium",
    category: "Creator",
    premium: true,
    theme: getTheme("aurora"),
    layout: getLayout("centered"),
    profile: {
      name: "Sofía Rivera",
      username: "sofiarivera",
      role: "Creative Director",
      company: "Estudio Nova",
      location: "Barcelona, ES",
      description:
        "Diseño experiencias digitales para marcas que quieren decir algo. Dirección creativa, identidad y producto.",
      verified: true,
      avatarUrl: IMG.avatarSofia,
      avatar: {
        size: 104,
        radius: 999,
        borderWidth: 4,
        shadow: true,
        overlap: 56,
        align: "center",
      },
      banner: {
        enabled: true,
        imageUrl: IMG.bannerCreator,
        height: 210,
        mobileHeight: 150,
        overlay: 0.2,
        blur: 0,
        gradient: true,
        focalX: 50,
        focalY: 45,
        radius: 22,
      },
    },
    blocks: [
      block("buttonGroup", "row", {
        items: [
          { id: nextId("btn"), label: "Contactarme", url: "mailto:hola@sofiarivera.com" },
          { id: nextId("btn"), label: "Portfolio", url: "https://sofiarivera.com" },
        ],
      }),
      block("trust", "row", {
        badges: [
          { id: nextId("bdg"), label: "Verified profile", icon: "BadgeCheck" },
          { id: nextId("bdg"), label: "Responds in 24h", icon: "Clock" },
          { id: nextId("bdg"), label: "Awwwards 2025", icon: "Star" },
        ],
      }),
      block("featuredLink", "cover", {
        title: "Nova — Rebrand completo",
        subtitle: "Featured case study",
        url: "https://sofiarivera.com/nova",
        imageUrl: IMG.work3,
      }),
      block(
        "video",
        "card",
        { title: "Showreel 2026", provider: "youtube", videoId: "ScMzIvxBSi4" },
        { span: 1, aspect: "video" },
      ),
      block(
        "qr",
        "card",
        { title: "Escanea mi perfil", url: "https://platform.com/sofiarivera" },
        { span: 1 },
      ),
      block("links", "glass", {
        title: "Enlaces",
        items: [
          {
            id: nextId("link"),
            label: "Reserva una llamada",
            url: "https://cal.com/sofiarivera",
            newTab: true,
          },
          {
            id: nextId("link"),
            label: "Newsletter · 12k lectores",
            url: "https://sofiarivera.com/newsletter",
            newTab: true,
          },
          {
            id: nextId("link"),
            label: "Curso de dirección creativa",
            url: "https://sofiarivera.com/curso",
            newTab: true,
          },
        ],
      }),
      block(
        "portfolio",
        "grid",
        {
          title: "Selected work",
          items: [
            {
              id: nextId("pf"),
              label: "Atlas App",
              description: "Product design",
              url: "https://sofiarivera.com/atlas",
              imageUrl: IMG.work2,
            },
            {
              id: nextId("pf"),
              label: "Lumen Studio",
              description: "Brand identity",
              url: "https://sofiarivera.com/lumen",
              imageUrl: IMG.work1,
            },
          ],
        },
        { columns: 2, gap: 10 },
      ),
      block("document", "row", {
        title: "Media Kit 2026",
        fileName: "sofia-rivera-mediakit.pdf",
        fileSize: "2.4 MB",
        url: "https://sofiarivera.com/mediakit.pdf",
      }),
      block("social", "icons", {
        socials: [
          { id: nextId("soc"), platform: "instagram", url: "https://instagram.com/sofiarivera" },
          { id: nextId("soc"), platform: "linkedin", url: "https://linkedin.com/in/sofiarivera" },
          { id: nextId("soc"), platform: "youtube", url: "https://youtube.com/@sofiarivera" },
          { id: nextId("soc"), platform: "dribbble", url: "https://dribbble.com/sofiarivera" },
        ],
      }),
    ],
  });
}

/* ------------------------------------------------------------------ */
/* 002 — Executive Premium                                             */
/* ------------------------------------------------------------------ */

function executivePremium(): BioTemplateConfig {
  resetIds(2000);
  return buildTemplate({
    pageInstanceId: "executive-premium-002-demo",
    templateDefinitionId: "executive-premium-002",
    name: "Executive Premium",
    category: "Executive",
    premium: true,
    theme: getTheme("corporate"),
    layout: getLayout("executive"),
    profile: {
      name: "Daniel Márquez",
      username: "dmarquez",
      role: "Managing Partner",
      company: "Aurelia Capital",
      location: "Madrid, ES",
      description:
        "Advising founders and institutional investors across Southern Europe. 18 years in growth capital and corporate strategy.",
      verified: true,
      avatarUrl: IMG.avatarExec,
      avatar: { size: 88, radius: 14, borderWidth: 0, shadow: false, overlap: 40, align: "left" },
      banner: {
        enabled: true,
        imageUrl: IMG.bannerExec,
        height: 170,
        mobileHeight: 120,
        overlay: 0.35,
        blur: 0,
        gradient: true,
        focalX: 50,
        focalY: 40,
        radius: 12,
      },
    },
    blocks: [
      block(
        "heading",
        "eyebrow",
        { title: "Practice", subtitle: "Aurelia Capital" },
        { align: "left" },
      ),
      block(
        "text",
        "default",
        {
          body: "I work with management teams on capital structure, market entry and long-horizon value creation. Selected mandates available on request.",
        },
        { align: "left" },
      ),
      block(
        "trust",
        "cards",
        {
          badges: [
            { id: nextId("bdg"), label: "CFA Charterholder", icon: "ShieldCheck" },
            { id: nextId("bdg"), label: "€480M deployed", icon: "Star" },
            { id: nextId("bdg"), label: "Verified identity", icon: "BadgeCheck" },
          ],
        },
        { align: "left" },
      ),
      block(
        "cta",
        "panel",
        {
          title: "Schedule a conversation",
          body: "30 minutes, no obligation. Availability updated weekly.",
          label: "Open calendar",
          url: "https://cal.com/dmarquez",
        },
        { align: "left" },
      ),
      block("document", "row", {
        title: "Firm overview",
        fileName: "aurelia-overview.pdf",
        fileSize: "1.1 MB",
        url: "https://aurelia.example.com/overview.pdf",
      }),
      block("document", "row", {
        title: "2026 Market outlook",
        fileName: "outlook-2026.pdf",
        fileSize: "3.8 MB",
        url: "https://aurelia.example.com/outlook.pdf",
      }),
      block(
        "contact",
        "card",
        {
          title: "Direct contact",
          email: "d.marquez@aurelia.example.com",
          phone: "+34 910 000 000",
          address: "Paseo de la Castellana 21, Madrid",
        },
        { align: "left" },
      ),
      block("links", "list", {
        title: "More",
        items: [
          {
            id: nextId("link"),
            label: "Portfolio companies",
            url: "https://aurelia.example.com/portfolio",
          },
          {
            id: nextId("link"),
            label: "Press & commentary",
            url: "https://aurelia.example.com/press",
          },
        ],
      }),
      block(
        "social",
        "pills",
        {
          socials: [
            { id: nextId("soc"), platform: "linkedin", url: "https://linkedin.com/in/dmarquez" },
            { id: nextId("soc"), platform: "twitter", url: "https://x.com/dmarquez" },
          ],
        },
        { align: "left" },
      ),
    ],
  });
}

/* ------------------------------------------------------------------ */
/* 003 — Modern Bento                                                  */
/* ------------------------------------------------------------------ */

function modernBento(): BioTemplateConfig {
  resetIds(3000);
  return buildTemplate({
    pageInstanceId: "modern-bento-003-demo",
    templateDefinitionId: "modern-bento-003",
    name: "Modern Bento",
    category: "Portfolio",
    premium: true,
    theme: getTheme("electric"),
    layout: getLayout("bento"),
    profile: {
      name: "Kai Moreno",
      username: "kaimoreno",
      role: "Motion & 3D",
      company: "",
      location: "Remote",
      description:
        "Motion design, 3D and interaction. Currently free for two projects this quarter.",
      verified: false,
      avatar: { size: 82, radius: 22, borderWidth: 0, shadow: true, overlap: 34, align: "left" },
      banner: {
        enabled: true,
        imageUrl: IMG.bannerBento,
        height: 200,
        mobileHeight: 140,
        overlay: 0.25,
        blur: 0,
        gradient: true,
        focalX: 50,
        focalY: 50,
        radius: 24,
      },
    },
    blocks: [
      block(
        "cta",
        "gradient",
        {
          title: "Available for work",
          body: "Two slots open · Q3 2026",
          label: "Start a project",
          url: "https://cal.com/kaimoreno",
        },
        { span: 2, align: "left" },
      ),
      block(
        "video",
        "embed",
        { provider: "youtube", videoId: "ScMzIvxBSi4" },
        { span: 1, aspect: "video" },
      ),
      block(
        "mediaCard",
        "cover",
        {
          title: "Inside the studio",
          body: "Process, tools and experiments.",
          imageUrl: IMG.studio,
          url: "https://kaimoreno.example.com/studio",
        },
        { span: 1 },
      ),
      block(
        "gallery",
        "grid",
        {
          title: "Frames",
          images: [
            { id: nextId("img"), url: IMG.gallery1 },
            { id: nextId("img"), url: IMG.gallery2 },
            { id: nextId("img"), url: IMG.gallery3 },
          ],
        },
        { span: 1, columns: 3, gap: 6 },
      ),
      block("qr", "card", { title: "Scan", url: "https://platform.com/kaimoreno" }, { span: 1 }),
      block(
        "links",
        "cards",
        {
          items: [
            {
              id: nextId("link"),
              label: "Behance",
              description: "Full case studies",
              url: "https://behance.net",
              imageUrl: IMG.work1,
            },
            {
              id: nextId("link"),
              label: "Shop presets",
              description: "Motion toolkit",
              url: "https://gumroad.com",
              imageUrl: IMG.work2,
            },
          ],
        },
        { span: 2 },
      ),
      block(
        "social",
        "icons",
        {
          socials: [
            { id: nextId("soc"), platform: "instagram", url: "https://instagram.com" },
            { id: nextId("soc"), platform: "twitter", url: "https://x.com" },
            { id: nextId("soc"), platform: "github", url: "https://github.com" },
            { id: nextId("soc"), platform: "twitch", url: "https://twitch.tv" },
          ],
        },
        { span: 2, align: "left" },
      ),
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Derived definitions — same engine, different composition            */
/* ------------------------------------------------------------------ */

function derive(
  id: string,
  name: string,
  category: TemplateDefinition["category"],
  description: string,
  from: () => BioTemplateConfig,
  themeId: string,
  layoutId: string,
  premium = false,
): TemplateDefinition {
  return {
    id,
    name,
    category,
    description,
    premium,
    base: id,
    layout: layoutId as TemplateDefinition["layout"],
    themeId,
    build: () => {
      const config = from();
      return {
        ...config,
        templateDefinitionId: id,
        metadata: { ...config.metadata, templateDefinitionId: id, name, category, premium },
        theme: getTheme(themeId),
        layout: getLayout(layoutId),
      };
    },
  };
}

import { RECIPE_REGISTRY } from "./recipeRegistry";

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  // Base configurations
  {
    id: "creator-premium-001",
    name: "Creator Premium",
    category: "Creator",
    description: "Hero banner, showreel, portfolio grid and QR profile.",
    premium: true,
    base: "creator",
    layout: "centered",
    themeId: "aurora",
    build: creatorPremium,
  },
  {
    id: "executive-premium-002",
    name: "Executive Premium",
    category: "Executive",
    description: "Sober composition with documents, trust and direct contact.",
    premium: true,
    base: "executive",
    layout: "executive",
    themeId: "corporate",
    build: executivePremium,
  },
  {
    id: "modern-bento-003",
    name: "Modern Bento",
    category: "Business",
    description: "Bento grid mixing video, gallery, cards and QR.",
    premium: true,
    base: "bento",
    layout: "bento",
    themeId: "electric",
    build: modernBento,
  },
  derive(
    "editorial-journal-004",
    "Editorial Journal",
    "Personal",
    "Long-form, serif typography, quiet palette.",
    creatorPremium,
    "editorial",
    "editorial",
  ),
  derive(
    "minimal-card-005",
    "Minimal Card",
    "Minimal",
    "One clean card, nothing else.",
    creatorPremium,
    "minimal",
    "profile-card",
  ),
  derive(
    "luxury-noir-006",
    "Luxury Noir",
    "Luxury",
    "Gold on black, generous spacing.",
    executivePremium,
    "luxury",
    "editorial",
    true,
  ),
  derive(
    "ocean-studio-007",
    "Ocean Studio",
    "Business",
    "Soft gradient, rounded pills, friendly.",
    creatorPremium,
    "ocean",
    "compact",
  ),
  derive(
    "graphite-folio-008",
    "Graphite Folio",
    "Portfolio",
    "Flat neutral grid for makers.",
    modernBento,
    "graphite",
    "portfolio",
  ),
  derive(
    "warm-table-009",
    "Warm Table",
    "Restaurant",
    "Warm palette for hospitality brands.",
    creatorPremium,
    "warm",
    "centered",
  ),
  derive(
    "cloud-corporate-010",
    "Cloud Corporate",
    "Corporate",
    "Neutral, trustworthy, document-first.",
    executivePremium,
    "cloud",
    "split",
  ),
  derive(
    "midnight-artist-011",
    "Midnight Artist",
    "Artist",
    "Dark, high-contrast, media forward.",
    modernBento,
    "midnight",
    "bento",
    true,
  ),
  derive(
    "aurora-tech-012",
    "Aurora Tech",
    "Technology",
    "Glass cards over an aurora gradient.",
    modernBento,
    "aurora",
    "portfolio",
    true,
  ),

  // Extended recipes
  ...RECIPE_REGISTRY,
];

export const TEMPLATE_DEFINITION_MAP: Record<string, TemplateDefinition> = Object.fromEntries(
  TEMPLATE_DEFINITIONS.map((t) => [t.id, t]),
);

export function getTemplateDefinition(id: string): TemplateDefinition {
  return TEMPLATE_DEFINITION_MAP[id] ?? TEMPLATE_DEFINITIONS[0]!;
}

/** Demo config used by the studio when the host provides none. */
export function createDemoConfig(): BioTemplateConfig {
  return creatorPremium();
}
