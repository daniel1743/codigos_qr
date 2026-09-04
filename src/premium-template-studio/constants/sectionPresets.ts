import { uid } from "../utils";
import { getBlockDefinition } from "./blockDefinitions";
import type { BlockType, TemplateBlock } from "../types";

export type PresetCategory =
  "Hero" | "Services" | "Booking" | "Portfolio" | "Reviews" | "Products" | "Media" | "Contact";

export interface SectionPreset {
  id: string;
  name: string;
  category: PresetCategory;
  description?: string;
  badge?: string;
  previewType:
    "hero" | "pricing" | "services" | "faq" | "bento" | "testimonials" | "contact" | "stats";
  createBlocks: () => TemplateBlock[];
}

// Utility to create a block with overrides.
export function b(
  type: BlockType,
  variant: string,
  contentOverrides: Partial<TemplateBlock["content"]> = {},
  layoutOverrides: Partial<TemplateBlock["layout"]> = {},
  styleOverrides: Partial<TemplateBlock["style"]> = {},
): TemplateBlock {
  const def = getBlockDefinition(type);
  const defaults: Omit<TemplateBlock, "id"> = def
    ? def.defaults()
    : {
        type,
        variant,
        content: {},
        style: {},
        layout: { aspect: "auto" },
        visibility: { desktop: true, tablet: true, mobile: true },
        interaction: { newTab: true },
      };

  return {
    ...defaults,
    id: uid("block"),
    type,
    variant,
    content: { ...defaults.content, ...contentOverrides },
    layout: { ...defaults.layout, ...layoutOverrides },
    style: { ...defaults.style, ...styleOverrides },
  };
}

export const SECTION_PRESETS: SectionPreset[] = [
  // ==========================================
  // HERO PRESETS (6)
  // ==========================================
  {
    id: "hero-medical-profile",
    name: "Medical Profile Hero",
    category: "Hero",
    badge: "Popular",
    previewType: "hero",
    createBlocks: () => [
      b(
        "hero",
        "default",
        {
          title: "Dr. Elena Rostova",
          subtitle: "Chief of Neurosurgery",
          body: "Specializing in minimally invasive spine surgery and brain tumor resections with 15+ years of clinical excellence.",
        },
        { colSpan: 12 },
      ),
      b(
        "trust",
        "badges",
        {
          badges: [
            { id: uid("bdg"), label: "Board Certified", icon: "BadgeCheck" },
            { id: uid("bdg"), label: "Top Doctor 2026", icon: "Award" },
          ],
        },
        { colSpan: 12 },
      ),
      b("cta", "primary", { label: "Book Consultation", url: "#booking" }, { colSpan: 12 }),
    ],
  },
  {
    id: "hero-professional-trust",
    name: "Professional Trust Hero",
    category: "Hero",
    previewType: "hero",
    createBlocks: () => [
      b(
        "hero",
        "centered",
        {
          title: "Legal Counsel You Can Trust",
          subtitle: "Boutique Law Firm",
          body: "We protect your assets and your future.",
        },
        { colSpan: 12, align: "center" },
      ),
      b(
        "buttonGroup",
        "inline",
        {
          items: [
            { id: uid("btn"), label: "Our Services", url: "#services" },
            { id: uid("btn"), label: "Contact Us", url: "#contact" },
          ],
        },
        { colSpan: 12, align: "center" },
      ),
    ],
  },
  {
    id: "hero-executive-split",
    name: "Executive Split Hero",
    category: "Hero",
    previewType: "hero",
    createBlocks: () => [
      b(
        "hero",
        "split",
        {
          title: "Transform Your Business",
          subtitle: "Executive Coaching",
          body: "Unlock your leadership potential with personalized 1-on-1 coaching sessions.",
        },
        { colSpan: 12 },
      ),
    ],
  },
  {
    id: "hero-creator-editorial",
    name: "Creator Editorial",
    category: "Hero",
    previewType: "hero",
    createBlocks: () => [
      b(
        "hero",
        "editorial",
        {
          title: "Visual Storyteller",
          subtitle: "New York",
          body: "Capturing the unseen moments of urban life.",
        },
        { colSpan: 12 },
      ),
      b("social", "floating", {}, { colSpan: 12, align: "center" }),
    ],
  },
  {
    id: "hero-creator-full-image",
    name: "Creator Full Image",
    category: "Hero",
    previewType: "hero",
    createBlocks: () => [
      b(
        "featuredMedia",
        "cover",
        { title: "Latest Film", subtitle: "Out Now", videoId: "ScMzIvxBSi4" },
        { colSpan: 12 },
      ),
      b(
        "hero",
        "default",
        { title: "Director & Cinematographer", subtitle: "", body: "" },
        { colSpan: 12 },
      ),
    ],
  },
  {
    id: "hero-creator-bento-intro",
    name: "Creator Bento Intro",
    category: "Hero",
    previewType: "bento",
    createBlocks: () => [
      b(
        "hero",
        "compact",
        { title: "Hi, I'm Alex", subtitle: "Designer & Developer" },
        { colSpan: 8, rowSpan: 2 },
      ),
      b(
        "image",
        "avatar",
        {
          imageUrl:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=70",
        },
        { colSpan: 4, rowSpan: 2 },
      ),
      b("social", "grid", {}, { colSpan: 12 }),
    ],
  },

  // ==========================================
  // SERVICES PRESETS (4)
  // ==========================================
  {
    id: "services-bento",
    name: "Services Bento",
    category: "Services",
    previewType: "services",
    createBlocks: () => [
      b("heading", "eyebrow", { title: "What I Do", subtitle: "My Expertise" }, { colSpan: 12 }),
      b("services", "bento", {}, { colSpan: 12 }),
    ],
  },
  {
    id: "services-cards",
    name: "Services Cards",
    category: "Services",
    previewType: "services",
    createBlocks: () => [
      b("heading", "default", { title: "Core Services" }, { colSpan: 12 }),
      b("services", "cards", {}, { colSpan: 12 }),
    ],
  },
  {
    id: "services-editorial",
    name: "Services Editorial",
    category: "Services",
    previewType: "services",
    createBlocks: () => [b("services", "list", {}, { colSpan: 12 })],
  },
  {
    id: "services-compact",
    name: "Services Compact",
    category: "Services",
    previewType: "services",
    createBlocks: () => [
      b("heading", "divider", { title: "Capabilities" }, { colSpan: 12 }),
      b("services", "pills", {}, { colSpan: 12 }),
    ],
  },

  // ==========================================
  // BOOKING PRESETS (3)
  // ==========================================
  {
    id: "booking-simple",
    name: "Booking Simple",
    category: "Booking",
    previewType: "contact",
    createBlocks: () => [
      b(
        "heading",
        "default",
        { title: "Book an Appointment", subtitle: "Select a time below" },
        { colSpan: 12 },
      ),
      b("booking", "default", {}, { colSpan: 12 }),
    ],
  },
  {
    id: "booking-split",
    name: "Booking Split",
    category: "Booking",
    previewType: "contact",
    createBlocks: () => [b("booking", "split", {}, { colSpan: 12 })],
  },
  {
    id: "booking-premium-card",
    name: "Booking Premium Card",
    category: "Booking",
    previewType: "contact",
    createBlocks: () => [b("booking", "card", {}, { colSpan: 12 })],
  },

  // ==========================================
  // PORTFOLIO PRESETS (3)
  // ==========================================
  {
    id: "portfolio-bento",
    name: "Portfolio Bento",
    category: "Portfolio",
    previewType: "bento",
    createBlocks: () => [
      b("heading", "eyebrow", { title: "Selected Works", subtitle: "Portfolio" }, { colSpan: 12 }),
      b("portfolio", "bento", {}, { colSpan: 12 }),
    ],
  },
  {
    id: "portfolio-gallery",
    name: "Portfolio Gallery",
    category: "Portfolio",
    previewType: "bento",
    createBlocks: () => [
      b("heading", "default", { title: "Gallery" }, { colSpan: 12, align: "center" }),
      b("gallery", "grid", {}, { colSpan: 12 }),
    ],
  },
  {
    id: "portfolio-editorial",
    name: "Portfolio Editorial",
    category: "Portfolio",
    previewType: "bento",
    createBlocks: () => [b("portfolio", "list", {}, { colSpan: 12 })],
  },

  // ==========================================
  // REVIEWS PRESETS (3)
  // ==========================================
  {
    id: "reviews-cards",
    name: "Reviews Cards",
    category: "Reviews",
    previewType: "testimonials",
    createBlocks: () => [
      b(
        "heading",
        "eyebrow",
        { title: "Client Stories", subtitle: "Testimonials" },
        { colSpan: 12, align: "center" },
      ),
      b("testimonials", "cards", {}, { colSpan: 12 }),
    ],
  },
  {
    id: "reviews-featured",
    name: "Featured Testimonial",
    category: "Reviews",
    previewType: "testimonials",
    createBlocks: () => [b("testimonials", "featured", {}, { colSpan: 12 })],
  },
  {
    id: "reviews-trust-grid",
    name: "Trust Grid",
    category: "Reviews",
    previewType: "testimonials",
    createBlocks: () => [
      b("stats", "grid", {}, { colSpan: 12 }),
      b("testimonials", "bento", {}, { colSpan: 12 }),
    ],
  },

  // ==========================================
  // PRODUCTS PRESETS (3)
  // ==========================================
  {
    id: "product-spotlight",
    name: "Product Spotlight",
    category: "Products",
    badge: "New",
    previewType: "pricing",
    createBlocks: () => [b("product", "featured", {}, { colSpan: 12 })],
  },
  {
    id: "product-grid-premium",
    name: "Product Grid Premium",
    category: "Products",
    previewType: "pricing",
    createBlocks: () => [
      b("heading", "default", { title: "Shop" }, { colSpan: 12 }),
      b("productGrid", "default", {}, { colSpan: 12 }),
    ],
  },
  {
    id: "product-bento-showcase",
    name: "Product Bento Showcase",
    category: "Products",
    previewType: "pricing",
    createBlocks: () => [b("productGrid", "bento", {}, { colSpan: 12 })],
  },

  // ==========================================
  // MEDIA PRESETS (3)
  // ==========================================
  {
    id: "media-featured-video",
    name: "Featured Video",
    category: "Media",
    previewType: "hero",
    createBlocks: () => [b("featuredMedia", "cinema", {}, { colSpan: 12 })],
  },
  {
    id: "media-music-spotlight",
    name: "Music Spotlight",
    category: "Media",
    previewType: "stats",
    createBlocks: () => [b("music", "player", {}, { colSpan: 12 })],
  },
  {
    id: "media-bento",
    name: "Media Bento",
    category: "Media",
    previewType: "bento",
    createBlocks: () => [
      b("video", "cover", {}, { colSpan: 8, rowSpan: 2 }),
      b("image", "standard", {}, { colSpan: 4, rowSpan: 1 }),
      b("music", "compact", {}, { colSpan: 4, rowSpan: 1 }),
    ],
  },

  // ==========================================
  // CONTACT PRESETS (4)
  // ==========================================
  {
    id: "contact-minimal",
    name: "Contact Minimal",
    category: "Contact",
    previewType: "contact",
    createBlocks: () => [
      b("heading", "default", { title: "Get in touch" }, { colSpan: 12 }),
      b("contact", "list", {}, { colSpan: 12 }),
    ],
  },
  {
    id: "contact-card",
    name: "Contact Card",
    category: "Contact",
    previewType: "contact",
    createBlocks: () => [b("contact", "card", {}, { colSpan: 12 })],
  },
  {
    id: "contact-map",
    name: "Contact + Map",
    category: "Contact",
    previewType: "contact",
    createBlocks: () => [
      b("map", "default", {}, { colSpan: 12 }),
      b("contact", "bento", {}, { colSpan: 12 }),
    ],
  },
  {
    id: "contact-floating",
    name: "Contact + Floating CTA",
    category: "Contact",
    previewType: "contact",
    createBlocks: () => [
      b("contact", "card", {}, { colSpan: 12 }),
      b("floatingActions", "default", {}, { colSpan: 12 }),
    ],
  },
];
