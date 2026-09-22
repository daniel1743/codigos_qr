import type { BioTemplateConfig, LayoutId, TemplateBlock, TemplateDefinition } from "../types";
import { buildTemplate } from "../engine/TemplateBuilder";
import { getLayout } from "../constants/layouts";
import { getTheme } from "../constants/themes";
import { SECTION_PRESETS } from "../constants/sectionPresets";
import { uid } from "../utils";

function composeRecipe(
  id: string,
  name: string,
  category: TemplateDefinition["category"],
  description: string,
  themeId: string,
  layoutId: string,
  presetIds: string[],
  base: string = "creator",
  transform?: (config: BioTemplateConfig) => BioTemplateConfig,
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
      const config = buildTemplate({
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
      return transform ? transform(config) : config;
    },
  };
}

function restaurantVisualDefaults(config: BioTemplateConfig): BioTemplateConfig {
  const blocks = config.blocks.map((block) => {
    if (block.type === "hero") {
      return {
        ...block,
        content: {
          ...block.content,
          title: "Casa Mediterránea",
          eyebrow: "Cocina mediterránea",
          subtitle: "Cocina fresca, simple y hecha para compartir",
          body: "Descubre nuestros platos, horarios y opciones para reservar.",
          description: "Sabores mediterráneos preparados para compartir.",
          badge: { label: "Restaurante", enabled: true },
          primaryCTA: { label: "Ver menú", url: "#menu" },
          secondaryCTA: { label: "Reservar", url: "#reservas" },
        },
      };
    }

    if (block.type === "heading") {
      return {
        ...block,
        content: {
          ...block.content,
          title: "Nuestro menú",
          subtitle: "Platos frescos y sabores mediterráneos",
        },
      };
    }

    if (block.type === "buttonGroup") {
      return {
        ...block,
        content: {
          ...block.content,
          items: [
            { id: `${block.id}-menu`, label: "Ver menú", url: "#menu" },
            { id: `${block.id}-booking`, label: "Reservar", url: "#reservas" },
          ],
        },
      };
    }

    if (block.type === "productGrid") {
      return {
        ...block,
        content: {
          ...block.content,
          products: [
            {
              id: `${block.id}-pasta`,
              title: "Pasta de la casa",
              description: "Pasta fresca, salsa de tomate asado y albahaca.",
              price: "$12.900",
              imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600",
              ctaLabel: "Pedir",
              ctaUrl: "#reservas",
            },
            {
              id: `${block.id}-salad`,
              title: "Ensalada mediterránea",
              description: "Hojas frescas, tomate, aceitunas y queso.",
              price: "$9.900",
              imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
              ctaLabel: "Pedir",
              ctaUrl: "#reservas",
            },
            {
              id: `${block.id}-tiramisu`,
              title: "Tiramisú",
              description: "Postre clásico de café y cacao.",
              price: "$6.500",
              imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600",
              ctaLabel: "Pedir",
              ctaUrl: "#reservas",
            },
          ],
        },
      };
    }

    if (block.type === "contact") {
      return {
        ...block,
        content: {
          ...block.content,
          title: "Visítanos o reserva",
          email: "reservas@casamediterranea.example",
          phone: "+56 2 2345 6789",
          address: "Av. Providencia 1234, Santiago",
          bookingUrl: "#reservas",
          bookingLabel: "Reservar una mesa",
          customCtaUrl: "#menu",
          customCtaLabel: "Ver menú completo",
        },
      };
    }

    return block;
  });

  return {
    ...config,
    profile: {
      ...config.profile,
      name: "Casa Mediterránea",
      role: "Restaurante y cocina mediterránea",
      location: "Santiago, Chile",
      description: "Cocina fresca, simple y hecha para compartir.",
    },
    blocks,
  };
}

/**
 * Canonical menu starter captured from the approved persisted reference page
 * 33b083d9-7387-44cc-ac78-889a91bf0a1a. Keep this repository-owned: new pages
 * must not depend on the reference row remaining in the database.
 */
function menuDefaultV1(): BioTemplateConfig {
  const blockDefaults = {
    style: {},
    layout: { span: 2, align: "center" as const, width: "content" as const, colSpan: 12 },
    visibility: { mobile: true, tablet: true, desktop: true },
    interaction: { newTab: true },
  };
  const blocks: TemplateBlock[] = [
    {
      ...blockDefaults,
      id: "block_b66d11b7",
      type: "buttonGroup",
      variant: "inline",
      content: {
        items: [
          { id: "block_b66d11b7-menu", url: "#menu", label: "Ver menú" },
          { id: "block_b66d11b7-booking", url: "#reservas", label: "Reservar" },
        ],
      },
    },
    {
      ...blockDefaults,
      id: "block_cc4983c7",
      type: "heading",
      variant: "default",
      content: {
        title: "Nuestro menú",
        subtitle: "Platos frescos y sabores mediterráneos",
      },
    },
    {
      ...blockDefaults,
      id: "block_dc4480cd",
      type: "productGrid",
      variant: "default",
      content: {
        products: [
          {
            id: "block_dc4480cd-pasta",
            price: "$12.900",
            title: "Pasta de la casa",
            ctaUrl: "#reservas",
            ctaLabel: "Pedir",
            imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600",
            description: "Pasta fresca, salsa de tomate asado y albahaca.",
          },
          {
            id: "block_dc4480cd-salad",
            price: "$9.900",
            title: "Ensalada mediterránea",
            ctaUrl: "#reservas",
            ctaLabel: "Pedir",
            imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
            description: "Hojas frescas, tomate, aceitunas y queso.",
          },
          {
            id: "block_dc4480cd-tiramisu",
            price: "$6.500",
            title: "Tiramisú",
            ctaUrl: "#reservas",
            ctaLabel: "Pedir",
            imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600",
            description: "Postre clásico de café y cacao.",
          },
        ],
      },
    },
    {
      ...blockDefaults,
      id: "block_f90723e5",
      type: "contact",
      variant: "card",
      content: {
        email: "reservas@casamediterranea.example",
        phone: "+56 2 2345 6789",
        title: "Visítanos o reserva",
        address: "Av. Providencia 1234, Santiago",
        bookingUrl: "#reservas",
        bookingLabel: "Reservar una mesa",
        customCtaUrl: "#menu",
        customCtaLabel: "Ver menú completo",
      },
    },
  ];

  return buildTemplate({
    pageInstanceId: "menu-default-v1-demo",
    templateDefinitionId: "menu-default-v1",
    name: "Menu Default V1",
    category: "Restaurant",
    premium: true,
    theme: getTheme("aurora"),
    layout: getLayout("centered"),
    blocks,
    profile: {
      name: "DONDE MI NEGRO",
      username: "user",
      role: "Restaurante y cocina mediterránea",
      company: "",
      location: "Santiago, Chile",
      description: "Cocina fresca, simple y hecha para compartir.",
      verified: true,
      avatarUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=70",
      showAvatar: false,
      avatar: {
        size: 104,
        align: "center",
        radius: 999,
        shadow: true,
        overlap: 56,
        borderWidth: 4,
      },
      banner: {
        blur: 1,
        focalX: 50,
        focalY: 45,
        height: 210,
        radius: 0,
        enabled: true,
        overlay: 0.85,
        gradient: true,
        imageUrl:
          "https://mlinfiuhkxdhlveflbkj.supabase.co/storage/v1/object/public/avatars/8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165/power-editor/1790033330029-ChatGPT_Image_21_sept_2026__20_28_30.png",
        blendFade: { enabled: true, distance: 80, strength: 1 },
        widthMode: "full-bleed",
        mobileHeight: 272,
      },
    },
  });
}

function storeBentoDefaults(config: BioTemplateConfig): BioTemplateConfig {
  const blocks = config.blocks
    .filter((block) => block.type !== "image" && block.type !== "social")
    .map((block) => {
      if (block.type === "hero") {
        return {
          ...block,
          content: {
            ...block.content,
            title: "Nuestro catálogo",
            eyebrow: "Productos y soluciones",
            subtitle: "Explora nuestros productos y encuentra lo que necesitas.",
            body: "Conoce nuestra selección y consulta disponibilidad o detalles.",
            description: "Una selección clara de productos para elegir con confianza.",
            badge: { label: "Catálogo", enabled: true },
            primaryCTA: { label: "Ver productos", url: "#catalogo" },
            secondaryCTA: { label: "Consultar", url: "#contacto" },
          },
        };
      }

      if (block.type === "heading") {
        return {
          ...block,
          content: {
            ...block.content,
            title: "Productos destacados",
            subtitle: "Opciones para cada necesidad",
          },
        };
      }

      if (block.type === "productGrid") {
        return {
          ...block,
          content: {
            ...block.content,
            products: [
              {
                id: `${block.id}-featured`,
                title: "Producto destacado",
                description: "Una opción versátil para comenzar.",
                price: "$29.900",
                imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
                ctaLabel: "Ver producto",
                ctaUrl: "#contacto",
              },
              {
                id: `${block.id}-classic`,
                title: "Producto clásico",
                description: "Diseñado para el uso diario y resultados confiables.",
                price: "$19.900",
                imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600",
                ctaLabel: "Consultar",
                ctaUrl: "#contacto",
              },
              {
                id: `${block.id}-collection`,
                title: "Nueva colección",
                description: "Descubre las novedades disponibles esta temporada.",
                price: "$39.900",
                imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600",
                ctaLabel: "Comprar",
                ctaUrl: "#contacto",
              },
            ],
          },
        };
      }

      if (block.type === "contact") {
        return {
          ...block,
          content: {
            ...block.content,
            title: "Consulta o compra",
            email: "hola@tuempresa.example",
            phone: "+56 2 2345 6789",
            address: "Av. Providencia 1234, Santiago",
            bookingUrl: "#contacto",
            bookingLabel: "Consultar",
            customCtaUrl: "#catalogo",
            customCtaLabel: "Ver catálogo completo",
          },
        };
      }

      return block;
    });

  return {
    ...config,
    profile: {
      ...config.profile,
      name: "Nuestro catálogo",
      role: "Productos y soluciones",
      location: "Santiago, Chile",
      description: "Explora nuestros productos y encuentra lo que necesitas.",
    },
    blocks,
  };
}

/** Canonical Catalog starter captured from approved page 0d1ad73e-bedb-4250-a5ff-c33c2c55eaa7. */
function catalogDefaultV1(): BioTemplateConfig {
  const productGridId = uid("block");
  const headingId = uid("block");
  const contactId = uid("block");
  const shared = {
    style: {},
    layout: { span: 2, align: "center" as const, width: "content" as const, colSpan: 12 },
    visibility: { mobile: true, tablet: true, desktop: true },
    interaction: { newTab: true },
  };
  const blocks: TemplateBlock[] = [
    {
      ...shared,
      id: productGridId,
      type: "productGrid",
      variant: "bento",
      content: {
        products: [
          {
            id: `${productGridId}-featured`,
            price: "$29.900",
            title: "Producto destacado",
            ctaUrl: "#contacto",
            ctaLabel: "Ver producto",
            imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
            description: "Una opción versátil para comenzar.",
          },
          {
            id: `${productGridId}-classic`,
            price: "$19.900",
            title: "Producto clásico",
            ctaUrl: "#contacto",
            ctaLabel: "Consultar",
            imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600",
            description: "Diseñado para el uso diario y resultados confiables.",
          },
          {
            id: `${productGridId}-collection`,
            price: "$39.900",
            title: "Nueva colección",
            ctaUrl: "#contacto",
            ctaLabel: "Comprar",
            imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600",
            description: "Descubre las novedades disponibles esta temporada.",
          },
        ],
      },
    },
    {
      ...shared,
      id: headingId,
      type: "heading",
      variant: "default",
      content: { title: "Productos destacados", subtitle: "Opciones para cada necesidad" },
    },
    {
      ...shared,
      id: contactId,
      type: "contact",
      variant: "list",
      content: {
        email: "hola@tuempresa.example",
        phone: "+56 2 2345 6789",
        title: "Consulta o compra",
        address: "Av. Providencia 1234, Santiago",
        bookingUrl: "#contacto",
        bookingLabel: "Consultar",
        customCtaUrl: "#catalogo",
        customCtaLabel: "Ver catálogo completo",
      },
    },
  ];

  return buildTemplate({
    pageInstanceId: "catalog-default-v1-demo",
    templateDefinitionId: "catalog-default-v1",
    name: "Catalog Default V1",
    category: "Store / Product",
    premium: true,
    theme: getTheme("warm"),
    layout: getLayout("centered"),
    blocks,
    profile: {
      name: "Catalogo Fuxion",
      username: "user",
      role: "Productos y soluciones",
      company: "",
      location: "Santiago, Chile",
      description: "Explora nuestros productos y encuentra lo que necesitas.",
      verified: true,
      avatarUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=70",
      showAvatar: false,
      avatar: { size: 88, align: "left", radius: 14, shadow: false, overlap: 40, borderWidth: 0 },
      banner: {
        blur: 0,
        focalX: 50,
        focalY: 40,
        height: 352,
        radius: 48,
        enabled: true,
        overlay: 0.35,
        gradient: true,
        imageUrl:
          "https://mlinfiuhkxdhlveflbkj.supabase.co/storage/v1/object/public/avatars/8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165/power-editor/1790035167806-Diseno_sin_titulo-111.webp",
        widthMode: "full-bleed",
        mobileHeight: 272,
      },
    },
  });
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
  {
    id: "menu-default-v1",
    name: "Menu Default V1",
    category: "Restaurant",
    description: "Approved menu starter derived from the canonical reference page.",
    premium: true,
    base: "menu-default-v1",
    layout: "centered",
    themeId: "aurora",
    build: menuDefaultV1,
  },
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
    ["hero-professional-trust", "product-grid-premium", "contact-card"],
    "restaurant",
    restaurantVisualDefaults,
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
  {
    id: "catalog-default-v1",
    name: "Catalog Default V1",
    category: "Store / Product",
    description: "Approved catalog starter derived from the canonical reference page.",
    premium: true,
    base: "catalog-default-v1",
    layout: "centered",
    themeId: "warm",
    build: catalogDefaultV1,
  },
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
    "store",
    storeBentoDefaults,
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
