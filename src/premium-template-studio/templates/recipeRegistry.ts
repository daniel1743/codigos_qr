import type { BioTemplateConfig, LayoutId, TemplateDefinition } from "../types";
import { buildTemplate } from "../engine/TemplateBuilder";
import { getLayout } from "../constants/layouts";
import { getTheme } from "../constants/themes";
import { SECTION_PRESETS } from "../constants/sectionPresets";

function composeRecipe(
  id: string,
  name: string,
  category: TemplateDefinition["category"],
  description: string,
  themeId: string,
  layoutId: string,
  presetIds: string[],
  base: string = "creator",
): TemplateDefinition {
  return {
    id,
    name,
    category,
    description,
    premium: true,
    base,
    layout: layoutId as LayoutId,
    themeId,
    build: () => {
      const blocks = [];
      for (const presetId of presetIds) {
        const preset = SECTION_PRESETS.find((p) => p.id === presetId);
        if (preset) {
          blocks.push(...preset.createBlocks());
        }
      }
      return buildTemplate({
        pageInstanceId: `${id}-demo`,
        templateDefinitionId: id,
        name,
        category,
        premium: true,
        theme: getTheme(themeId),
        layout: getLayout(layoutId),
        blocks,
        profile: {
          name: name + " User",
          username: "user",
          role: category,
          company: "",
          location: "Global",
          description: "This is a demo page for the " + name + " template. Customize it freely.",
          verified: true,
          avatarUrl:
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=70",
          avatar: {
            size: 88,
            radius: 14,
            borderWidth: 0,
            shadow: false,
            overlap: 40,
            align: "left",
          },
          banner: {
            enabled: true,
            imageUrl:
              "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1600&q=70",
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
      });
    },
  };
}

export const RECIPE_REGISTRY: TemplateDefinition[] = [
  // 1. Creator (3)
  composeRecipe(
    "creator-premium",
    "Creator Premium",
    "Creator",
    "High-end creator profile with full media.",
    "aurora",
    "centered",
    ["hero-creator-full-image", "media-featured-video", "portfolio-gallery", "contact-minimal"],
  ),
  composeRecipe(
    "creator-editorial",
    "Creator Editorial",
    "Creator",
    "Text-heavy clean layout.",
    "editorial",
    "editorial",
    ["hero-creator-editorial", "services-editorial", "portfolio-editorial", "contact-minimal"],
  ),
  composeRecipe(
    "creator-bento",
    "Creator Bento",
    "Creator",
    "Modern bento grid profile.",
    "electric",
    "bento",
    ["hero-creator-bento-intro", "services-bento", "portfolio-bento", "contact-map"],
  ),

  // 2. Executive / Professional (3)
  composeRecipe(
    "executive-premium",
    "Executive Premium",
    "Executive",
    "Sober and trustworthy layout.",
    "corporate",
    "executive",
    ["hero-executive-split", "services-cards", "reviews-trust-grid", "contact-card"],
  ),
  composeRecipe(
    "professional-trust",
    "Professional Trust",
    "Professional",
    "Build trust instantly with clients.",
    "cloud",
    "split",
    ["hero-professional-trust", "services-compact", "reviews-featured", "contact-card"],
  ),
  composeRecipe(
    "consultant-editorial",
    "Consultant Editorial",
    "Professional",
    "Clean text-focused consulting profile.",
    "editorial",
    "editorial",
    ["hero-executive-split", "services-editorial", "contact-minimal"],
  ),

  // 3. Medical (3)
  composeRecipe(
    "medical-premium",
    "Medical Premium",
    "Medical",
    "High-trust clinic profile.",
    "ocean",
    "split",
    ["hero-medical-profile", "services-cards", "reviews-trust-grid", "booking-premium-card"],
  ),
  composeRecipe(
    "medical-booking",
    "Medical Booking",
    "Medical",
    "Focused on direct patient scheduling.",
    "cloud",
    "centered",
    ["hero-medical-profile", "booking-split", "contact-map"],
  ),
  composeRecipe(
    "medical-minimal",
    "Medical Minimal",
    "Medical",
    "Clean essential practitioner profile.",
    "minimal",
    "profile-card",
    ["hero-medical-profile", "services-compact", "contact-minimal"],
  ),

  // 4. Barber / Beauty (3)
  composeRecipe(
    "barber-premium",
    "Barber Premium",
    "Barber / Beauty",
    "Stylish dark layout for barbers.",
    "midnight",
    "bento",
    ["hero-creator-full-image", "services-bento", "portfolio-gallery", "booking-premium-card"],
  ),
  composeRecipe(
    "beauty-studio",
    "Beauty Studio",
    "Barber / Beauty",
    "Elegant aesthetic for salons.",
    "warm",
    "centered",
    ["hero-professional-trust", "services-cards", "portfolio-gallery", "contact-card"],
  ),
  composeRecipe(
    "salon-booking",
    "Salon Booking",
    "Barber / Beauty",
    "Quick booking-focused layout.",
    "ocean",
    "split",
    ["hero-medical-profile", "booking-split", "contact-minimal"],
  ),

  // 5. Restaurant (3)
  composeRecipe(
    "restaurant-premium",
    "Restaurant Premium",
    "Restaurant",
    "Premium dining experience.",
    "warm",
    "centered",
    ["hero-creator-full-image", "media-bento", "reviews-cards", "contact-map"],
  ),
  composeRecipe(
    "restaurant-visual",
    "Restaurant Visual",
    "Restaurant",
    "Photo-heavy menu showcase.",
    "midnight",
    "bento",
    ["hero-creator-full-image", "portfolio-gallery", "contact-card"],
  ),
  composeRecipe(
    "cafe-minimal",
    "Cafe Minimal",
    "Restaurant",
    "Clean and simple cafe landing.",
    "cloud",
    "split",
    ["hero-professional-trust", "services-compact", "contact-map"],
  ),

  // 6. Store / Product (3)
  composeRecipe(
    "product-launch",
    "Product Launch",
    "Store / Product",
    "High-impact single product launch.",
    "electric",
    "centered",
    ["product-spotlight", "media-featured-video", "reviews-featured"],
  ),
  composeRecipe(
    "store-bento",
    "Store Bento",
    "Store / Product",
    "Grid-based storefront.",
    "aurora",
    "bento",
    ["hero-creator-bento-intro", "product-bento-showcase", "contact-minimal"],
  ),
  composeRecipe(
    "luxury-product",
    "Luxury Product",
    "Store / Product",
    "Elegant product presentation.",
    "luxury",
    "editorial",
    ["hero-executive-split", "product-grid-premium", "contact-card"],
  ),

  // 7. Fitness (3)
  composeRecipe(
    "fitness-coach",
    "Fitness Coach",
    "Fitness",
    "Dynamic trainer profile.",
    "midnight",
    "split",
    ["hero-creator-full-image", "services-cards", "reviews-trust-grid", "contact-floating"],
  ),
  composeRecipe(
    "personal-trainer",
    "Personal Trainer",
    "Fitness",
    "Results-oriented layout.",
    "electric",
    "bento",
    ["hero-medical-profile", "services-bento", "booking-simple"],
  ),
  composeRecipe(
    "fitness-program",
    "Fitness Program",
    "Fitness",
    "Program sales and signups.",
    "aurora",
    "centered",
    ["hero-executive-split", "product-spotlight", "reviews-featured", "contact-card"],
  ),

  // 8. Music / Artist (3)
  composeRecipe(
    "artist-premium",
    "Artist Premium",
    "Music / Artist",
    "Full artist portfolio.",
    "midnight",
    "bento",
    ["hero-creator-full-image", "media-music-spotlight", "portfolio-gallery", "contact-floating"],
  ),
  composeRecipe(
    "music-release",
    "Music Release",
    "Music / Artist",
    "Focused on the latest drop.",
    "electric",
    "centered",
    ["media-music-spotlight", "media-featured-video", "contact-minimal"],
  ),
  composeRecipe(
    "dj-events",
    "DJ Events",
    "Music / Artist",
    "Tour dates and mixes.",
    "midnight",
    "split",
    ["hero-creator-editorial", "media-music-spotlight", "booking-simple", "contact-map"],
  ),

  // 9. Real Estate (3)
  composeRecipe(
    "agent-premium",
    "Agent Premium",
    "Real Estate",
    "Professional agent profile.",
    "corporate",
    "executive",
    ["hero-professional-trust", "portfolio-gallery", "reviews-cards", "contact-map"],
  ),
  composeRecipe(
    "property-showcase",
    "Property Showcase",
    "Real Estate",
    "Single property listing.",
    "luxury",
    "editorial",
    ["hero-creator-full-image", "services-editorial", "media-featured-video", "contact-card"],
  ),
  composeRecipe(
    "real-estate-bento",
    "Real Estate Bento",
    "Real Estate",
    "Modern agency layout.",
    "cloud",
    "bento",
    ["hero-creator-bento-intro", "portfolio-bento", "contact-map"],
  ),

  // 10. Portfolio (3)
  composeRecipe(
    "portfolio-editorial",
    "Portfolio Editorial",
    "Portfolio",
    "Refined case study presentation.",
    "editorial",
    "editorial",
    ["hero-creator-editorial", "portfolio-editorial", "contact-minimal"],
  ),
  composeRecipe(
    "portfolio-bento",
    "Portfolio Bento",
    "Portfolio",
    "Visual grid of works.",
    "graphite",
    "bento",
    ["hero-creator-bento-intro", "portfolio-bento", "contact-floating"],
  ),
  composeRecipe(
    "portfolio-minimal",
    "Portfolio Minimal",
    "Portfolio",
    "Bare essentials for makers.",
    "minimal",
    "profile-card",
    ["hero-medical-profile", "portfolio-gallery", "contact-minimal"],
  ),
];
