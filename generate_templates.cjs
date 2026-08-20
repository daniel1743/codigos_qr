const fs = require('fs');
const file = 'src/lib/design/template-presets.ts';

const content = `import type { Profile } from "../../types/database";

export interface TemplateStyle {
  font_family: string;
  background_color: string;
  button_color: string;
  button_text_color: string;
  button_radius: Profile["button_radius"];
  button_style: Profile["button_style"];
  theme_layout?: string;
  theme_surface?: string;
  theme_spacing?: string;
  title_color?: string;
  title_size?: string;
  title_weight?: string;
  title_align?: string;
  bio_color?: string;
  bio_size?: string;
  bio_weight?: string;
  bio_align?: string;
  avatar_shape?: Profile["avatar_shape"];
  ring_enabled?: boolean;
  ring_color?: string;
  ring_thickness?: "thin" | "medium";
  button_text_size?: string;
  button_text_weight?: string;
  button_content_align?: string;
  button_icon_position?: string;
}

export type TemplateTier = "free" | "premium";

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  family: string;
  tier: TemplateTier;
  style: TemplateStyle;
}

export const TEMPLATE_FAMILIES = [
  { id: "free", name: "Para ti" },
  { id: "luxury", name: "Luxury" },
  { id: "beauty", name: "Beauty" },
  { id: "business", name: "Business" },
  { id: "food", name: "Restaurantes" },
  { id: "creator", name: "Creadores" },
  { id: "wellness", name: "Wellness" },
  { id: "tech", name: "Tech" },
  { id: "fashion", name: "Fashion" },
  { id: "music", name: "Music" },
  { id: "events", name: "Eventos" }
];

export const TEMPLATE_FAMILY_OPTIONS = TEMPLATE_FAMILIES;

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  // --- FREE TIER (8 templates) ---
  {
    id: "free-minimal-white",
    name: "Minimal White",
    description: "Limpio y directo.",
    family: "free",
    tier: "free",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "standard",
      font_family: "Inter",
      background_color: "#FFFFFF",
      button_color: "#111111",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle",
    }
  },
  {
    id: "free-minimal-dark",
    name: "Minimal Dark",
    description: "Modo oscuro clásico.",
    family: "free",
    tier: "free",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "standard",
      font_family: "Inter",
      background_color: "#111111",
      button_color: "#FFFFFF",
      button_text_color: "#111111",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#FFFFFF",
      bio_color: "#A1A1AA",
    }
  },
  {
    id: "free-business-basic",
    name: "Business Basic",
    description: "Profesional y ordenado.",
    family: "free",
    tier: "free",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "compact",
      font_family: "IBM Plex Sans",
      background_color: "#F6F8FA",
      button_color: "#0F172A",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "card",
      avatar_shape: "rounded",
    }
  },
  {
    id: "free-creator-clean",
    name: "Creator Clean",
    description: "Para perfiles sociales.",
    family: "free",
    tier: "free",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "standard",
      font_family: "Manrope",
      background_color: "#F7F7F7",
      button_color: "#2563EB",
      button_text_color: "#FFFFFF",
      button_radius: "full",
      button_style: "solid",
      avatar_shape: "circle",
    }
  },
  {
    id: "free-warm",
    name: "Warm",
    description: "Colores cálidos.",
    family: "free",
    tier: "free",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "standard",
      font_family: "Nunito Sans",
      background_color: "#FFF4EC",
      button_color: "#A24B2A",
      button_text_color: "#FFFFFF",
      button_radius: "full",
      button_style: "soft",
      avatar_shape: "circle",
    }
  },
  {
    id: "free-ocean",
    name: "Ocean",
    description: "Colores frescos.",
    family: "free",
    tier: "free",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "standard",
      font_family: "Space Grotesk",
      background_color: "#EEF4FF",
      button_color: "#2563EB",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle",
    }
  },
  {
    id: "free-editorial-basic",
    name: "Editorial Basic",
    description: "Clásico y tipográfico.",
    family: "free",
    tier: "free",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "standard",
      font_family: "Lora",
      background_color: "#F3EEE6",
      button_color: "#181818",
      button_text_color: "#181818",
      button_radius: "none",
      button_style: "outline",
      avatar_shape: "square",
    }
  },
  {
    id: "free-modern",
    name: "Modern",
    description: "Líneas rectas.",
    family: "free",
    tier: "free",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "compact",
      font_family: "Inter",
      background_color: "#FAFAFA",
      button_color: "#000000",
      button_text_color: "#000000",
      button_radius: "none",
      button_style: "line",
      avatar_shape: "circle",
    }
  },

  // --- PREMIUM TIER ---

  // LUXURY (5 templates)
  {
    id: "prem-lux-noir",
    name: "Noir",
    description: "Quiet luxury en carbón.",
    family: "luxury",
    tier: "premium",
    style: {
      theme_layout: "minimal_center",
      theme_spacing: "generous",
      font_family: "Cormorant Garamond",
      background_color: "#111111",
      button_color: "#F5F1E8",
      button_text_color: "#F5F1E8",
      button_radius: "rounded",
      button_style: "outline",
      avatar_shape: "circle",
      ring_enabled: true,
      ring_color: "#F5F1E8",
      ring_thickness: "thin",
      title_color: "#F5F1E8",
      title_size: "xl",
      title_weight: "normal",
      bio_color: "#D5C5A1",
      bio_weight: "light",
      button_content_align: "center"
    }
  },
  {
    id: "prem-lux-maison",
    name: "Maison",
    description: "Marfil y elegancia clásica.",
    family: "luxury",
    tier: "premium",
    style: {
      theme_layout: "editorial_left",
      theme_spacing: "standard",
      font_family: "Playfair Display",
      background_color: "#F9F8F6",
      button_color: "#2C2C2C",
      button_text_color: "#2C2C2C",
      button_radius: "none",
      button_style: "minimal",
      avatar_shape: "square",
      title_color: "#1A1A1A",
      title_size: "xl",
      bio_color: "#555555",
      button_content_align: "left",
      button_text_weight: "normal"
    }
  },
  {
    id: "prem-lux-monaco",
    name: "Monaco",
    description: "Azul noche y detalles sutiles.",
    family: "luxury",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "compact",
      font_family: "Libre Baskerville",
      background_color: "#0B1320",
      button_color: "#91A7C5",
      button_text_color: "#0B1320",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#F7F8FA",
      bio_color: "#91A7C5"
    }
  },
  {
    id: "prem-lux-atelier",
    name: "Atelier",
    description: "Borgoña profundo, alto contraste.",
    family: "luxury",
    tier: "premium",
    style: {
      theme_layout: "minimal_center",
      theme_spacing: "generous",
      font_family: "Playfair Display",
      background_color: "#2C1018",
      button_color: "#D9B9A7",
      button_text_color: "#D9B9A7",
      button_radius: "none",
      button_style: "line",
      avatar_shape: "circle",
      title_color: "#F8F0E8",
      bio_color: "#D9B9A7"
    }
  },
  {
    id: "prem-lux-vellum",
    name: "Vellum",
    description: "Textura crema editorial.",
    family: "luxury",
    tier: "premium",
    style: {
      theme_layout: "professional_card",
      theme_surface: "#FFFFFF",
      theme_spacing: "compact",
      font_family: "Cormorant Garamond",
      background_color: "#EFECE6",
      button_color: "#333333",
      button_text_color: "#FFFFFF",
      button_radius: "none",
      button_style: "solid",
      avatar_shape: "square"
    }
  },

  // BEAUTY (5 templates)
  {
    id: "prem-beauty-blush",
    name: "Blush",
    description: "Rosa empolvado, bordes suaves.",
    family: "beauty",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "standard",
      font_family: "Playfair Display",
      background_color: "#EFE2DF",
      button_color: "#B26F78",
      button_text_color: "#B26F78",
      button_radius: "full",
      button_style: "soft",
      avatar_shape: "circle",
      title_color: "#442F31",
      bio_color: "#6D5154",
      button_content_align: "center"
    }
  },
  {
    id: "prem-beauty-aura",
    name: "Aura",
    description: "Nude y crema para spas.",
    family: "beauty",
    tier: "premium",
    style: {
      theme_layout: "minimal_center",
      theme_spacing: "generous",
      font_family: "DM Sans",
      background_color: "#FDFBF7",
      button_color: "#CBAE9A",
      button_text_color: "#FDFBF7",
      button_radius: "full",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#4A3F35",
      title_weight: "light"
    }
  },
  {
    id: "prem-beauty-serene",
    name: "Serene",
    description: "Verde salvia calmante.",
    family: "beauty",
    tier: "premium",
    style: {
      theme_layout: "editorial_left",
      theme_spacing: "standard",
      font_family: "Cormorant Garamond",
      background_color: "#E8F0E8",
      button_color: "#5B705B",
      button_text_color: "#5B705B",
      button_radius: "full",
      button_style: "outline",
      avatar_shape: "rounded",
      title_color: "#2C3D2C"
    }
  },
  {
    id: "prem-beauty-rose",
    name: "Rose Studio",
    description: "Glamour en tonos pastel.",
    family: "beauty",
    tier: "premium",
    style: {
      theme_layout: "professional_card",
      theme_surface: "#FFF9F7",
      theme_spacing: "compact",
      font_family: "Nunito Sans",
      background_color: "#F6E8E6",
      button_color: "#D48B93",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle"
    }
  },
  {
    id: "prem-beauty-glow",
    name: "Glow",
    description: "Moda y cuidado de la piel.",
    family: "beauty",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "standard",
      font_family: "Poppins",
      background_color: "#FDF6ED",
      button_color: "#C68E65",
      button_text_color: "#C68E65",
      button_radius: "full",
      button_style: "soft",
      avatar_shape: "circle"
    }
  },

  // FOOD (5 templates)
  {
    id: "prem-food-oliva",
    name: "Oliva",
    description: "Moderno con toques rústicos.",
    family: "food",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "compact",
      font_family: "Lora",
      background_color: "#F4F1E8",
      button_color: "#4D5B32",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#2C351B",
      bio_color: "#4D5B32"
    }
  },
  {
    id: "prem-food-bistro",
    name: "Bistro",
    description: "Oscuro y elegante.",
    family: "food",
    tier: "premium",
    style: {
      theme_layout: "minimal_center",
      theme_spacing: "standard",
      font_family: "DM Sans",
      background_color: "#34382A",
      button_color: "#C7B47A",
      button_text_color: "#34382A",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "square",
      title_color: "#F6F0DF",
      bio_color: "#C7B47A"
    }
  },
  {
    id: "prem-food-terra",
    name: "Terra",
    description: "Terracota para cafeterías y bistros.",
    family: "food",
    tier: "premium",
    style: {
      theme_layout: "professional_card",
      theme_surface: "#FFF9EF",
      theme_spacing: "compact",
      font_family: "Bitter",
      background_color: "#F2E6D6",
      button_color: "#B65D3A",
      button_text_color: "#FFF9EF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "rounded",
      title_color: "#44291C"
    }
  },
  {
    id: "prem-food-cafe",
    name: "Café Maison",
    description: "Colores cálidos del café.",
    family: "food",
    tier: "premium",
    style: {
      theme_layout: "editorial_left",
      theme_spacing: "standard",
      font_family: "Cormorant Garamond",
      background_color: "#EFE6DF",
      button_color: "#5B3E31",
      button_text_color: "#5B3E31",
      button_radius: "none",
      button_style: "outline",
      avatar_shape: "circle",
      title_color: "#362217"
    }
  },
  {
    id: "prem-food-savor",
    name: "Savor",
    description: "Para foodies y críticos.",
    family: "food",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "standard",
      font_family: "Nunito",
      background_color: "#FFFFFF",
      button_color: "#E05A47",
      button_text_color: "#FFFFFF",
      button_radius: "full",
      button_style: "solid",
      avatar_shape: "circle"
    }
  },

  // BUSINESS (5 templates)
  {
    id: "prem-biz-executive",
    name: "Executive",
    description: "Consultoría y servicios profesionales.",
    family: "business",
    tier: "premium",
    style: {
      theme_layout: "editorial_left",
      theme_spacing: "compact",
      font_family: "Manrope",
      background_color: "#0B1320",
      button_color: "#FFFFFF",
      button_text_color: "#0B1320",
      button_radius: "rounded",
      button_style: "card",
      avatar_shape: "rounded",
      title_color: "#F7F8FA",
      bio_color: "#91A7C5"
    }
  },
  {
    id: "prem-biz-boardroom",
    name: "Boardroom",
    description: "Azul profundo estructurado.",
    family: "business",
    tier: "premium",
    style: {
      theme_layout: "professional_card",
      theme_surface: "#FFFFFF",
      theme_spacing: "standard",
      font_family: "Plus Jakarta Sans",
      background_color: "#E2E8F0",
      button_color: "#1E293B",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle"
    }
  },
  {
    id: "prem-biz-signature",
    name: "Signature",
    description: "Minimalista para bufetes.",
    family: "business",
    tier: "premium",
    style: {
      theme_layout: "minimal_center",
      theme_spacing: "standard",
      font_family: "Montserrat",
      background_color: "#FDFDFD",
      button_color: "#0F172A",
      button_text_color: "#0F172A",
      button_radius: "none",
      button_style: "line",
      avatar_shape: "square"
    }
  },
  {
    id: "prem-biz-corporate",
    name: "Corporate",
    description: "Estilo corporativo limpio.",
    family: "business",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "compact",
      font_family: "Inter",
      background_color: "#F8FAFC",
      button_color: "#2563EB",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle"
    }
  },
  {
    id: "prem-biz-agency",
    name: "Agency",
    description: "Para agencias creativas.",
    family: "business",
    tier: "premium",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "generous",
      font_family: "Space Grotesk",
      background_color: "#000000",
      button_color: "#FACC15",
      button_text_color: "#000000",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#FFFFFF"
    }
  },

  // CREATOR (4 templates)
  {
    id: "prem-creator-pulse",
    name: "Pulse",
    description: "Alto impacto visual.",
    family: "creator",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "compact",
      font_family: "Outfit",
      background_color: "#0F172A",
      button_color: "#6366F1",
      button_text_color: "#FFFFFF",
      button_radius: "full",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#FFFFFF",
      button_content_align: "center"
    }
  },
  {
    id: "prem-creator-spotlight",
    name: "Spotlight",
    description: "Contraste fuerte para marcas personales.",
    family: "creator",
    tier: "premium",
    style: {
      theme_layout: "editorial_left",
      theme_spacing: "standard",
      font_family: "Archivo Black",
      background_color: "#FF5722",
      button_color: "#FFFFFF",
      button_text_color: "#FF5722",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "square",
      title_color: "#FFFFFF",
      bio_color: "#FFE0B2"
    }
  },
  {
    id: "prem-creator-vibe",
    name: "Vibe",
    description: "Estilo degradado pop.",
    family: "creator",
    tier: "premium",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "standard",
      font_family: "Poppins",
      background_color: "linear-gradient(135deg, #EC4899, #8B5CF6)",
      button_color: "#FFFFFF",
      button_text_color: "#9D174D",
      button_radius: "full",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#FFFFFF"
    }
  },
  {
    id: "prem-creator-stream",
    name: "Stream",
    description: "Gaming y streaming.",
    family: "creator",
    tier: "premium",
    style: {
      theme_layout: "dark_statement",
      theme_spacing: "compact",
      font_family: "Space Grotesk",
      background_color: "#09090B",
      button_color: "#10B981",
      button_text_color: "#09090B",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#FFFFFF",
      bio_color: "#A1A1AA"
    }
  },

  // WELLNESS (4 templates)
  {
    id: "prem-well-zen",
    name: "Zen",
    description: "Paz y tranquilidad en salvia.",
    family: "wellness",
    tier: "premium",
    style: {
      theme_layout: "minimal_center",
      theme_spacing: "generous",
      font_family: "Quicksand",
      background_color: "#E8EEE8",
      button_color: "#718A74",
      button_text_color: "#FFFFFF",
      button_radius: "full",
      button_style: "soft",
      avatar_shape: "circle",
      title_color: "#27352C"
    }
  },
  {
    id: "prem-well-flow",
    name: "Flow",
    description: "Yoga y movimiento.",
    family: "wellness",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "standard",
      font_family: "Nunito Sans",
      background_color: "#F7F0E6",
      button_color: "#8B7355",
      button_text_color: "#FFFFFF",
      button_radius: "full",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#3E3326"
    }
  },
  {
    id: "prem-well-breathe",
    name: "Breathe",
    description: "Tonos tierra orgánicos.",
    family: "wellness",
    tier: "premium",
    style: {
      theme_layout: "editorial_left",
      theme_spacing: "compact",
      font_family: "Lato",
      background_color: "#F4F1ED",
      button_color: "#6B705C",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "rounded"
    }
  },
  {
    id: "prem-well-balance",
    name: "Balance",
    description: "Diseño fresco y claro.",
    family: "wellness",
    tier: "premium",
    style: {
      theme_layout: "professional_card",
      theme_surface: "#FFFFFF",
      theme_spacing: "standard",
      font_family: "Cabin",
      background_color: "#E6F0EE",
      button_color: "#2A9D8F",
      button_text_color: "#FFFFFF",
      button_radius: "full",
      button_style: "solid",
      avatar_shape: "circle"
    }
  },

  // FASHION (3 templates)
  {
    id: "prem-fash-vogue",
    name: "Vogue",
    description: "Monocromo editorial.",
    family: "fashion",
    tier: "premium",
    style: {
      theme_layout: "editorial_left",
      theme_spacing: "generous",
      font_family: "Playfair Display",
      background_color: "#F4F2EF",
      button_color: "#111111",
      button_text_color: "#FFFFFF",
      button_radius: "none",
      button_style: "solid",
      avatar_shape: "square",
      title_size: "xl"
    }
  },
  {
    id: "prem-fash-runway",
    name: "Runway",
    description: "Imágenes de alto impacto.",
    family: "fashion",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "compact",
      font_family: "Montserrat",
      background_color: "#000000",
      button_color: "#FFFFFF",
      button_text_color: "#000000",
      button_radius: "none",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#FFFFFF"
    }
  },
  {
    id: "prem-fash-chic",
    name: "Chic",
    description: "Colores suaves, estilo elevado.",
    family: "fashion",
    tier: "premium",
    style: {
      theme_layout: "minimal_center",
      theme_spacing: "standard",
      font_family: "Raleway",
      background_color: "#FAF7F2",
      button_color: "#4A4A4A",
      button_text_color: "#4A4A4A",
      button_radius: "none",
      button_style: "line",
      avatar_shape: "circle"
    }
  },

  // MUSIC (3 templates)
  {
    id: "prem-music-vinyl",
    name: "Vinyl",
    description: "Oscuro escénico.",
    family: "music",
    tier: "premium",
    style: {
      theme_layout: "dark_statement",
      theme_spacing: "standard",
      font_family: "Anton",
      background_color: "#050505",
      button_color: "#FFFFFF",
      button_text_color: "#050505",
      button_radius: "full",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#FFFFFF",
      title_size: "xl"
    }
  },
  {
    id: "prem-music-neon",
    name: "Neon Nights",
    description: "Luces de club.",
    family: "music",
    tier: "premium",
    style: {
      theme_layout: "classic_center",
      theme_spacing: "compact",
      font_family: "Oswald",
      background_color: "linear-gradient(135deg, #020617, #701A75)",
      button_color: "#22D3EE_NEON",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#FFFFFF"
    }
  },
  {
    id: "prem-music-stage",
    name: "Stage",
    description: "Cálido y acústico.",
    family: "music",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "standard",
      font_family: "Montserrat",
      background_color: "#181312",
      button_color: "#FDBA74",
      button_text_color: "#181312",
      button_radius: "full",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#FFFFFF"
    }
  },

  // TECH (3 templates)
  {
    id: "prem-tech-cyber",
    name: "Cyber",
    description: "Desarrollo y digital.",
    family: "tech",
    tier: "premium",
    style: {
      theme_layout: "editorial_left",
      theme_spacing: "compact",
      font_family: "IBM Plex Sans",
      background_color: "#0A0A0A",
      button_color: "#2563EB",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "square",
      title_color: "#FFFFFF"
    }
  },
  {
    id: "prem-tech-saas",
    name: "SaaS",
    description: "Brillante y confiable.",
    family: "tech",
    tier: "premium",
    style: {
      theme_layout: "professional_card",
      theme_surface: "#FFFFFF",
      theme_spacing: "standard",
      font_family: "Inter",
      background_color: "#EEF2FF",
      button_color: "#4338CA",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "rounded"
    }
  },
  {
    id: "prem-tech-minimal",
    name: "Terminal",
    description: "Limpio como código.",
    family: "tech",
    tier: "premium",
    style: {
      theme_layout: "minimal_center",
      theme_spacing: "generous",
      font_family: "Space Grotesk",
      background_color: "#F4F4F5",
      button_color: "#18181B",
      button_text_color: "#FFFFFF",
      button_radius: "none",
      button_style: "solid",
      avatar_shape: "circle"
    }
  },

  // EVENTS (3 templates)
  {
    id: "prem-event-gala",
    name: "Gala",
    description: "Elegancia para invitaciones.",
    family: "events",
    tier: "premium",
    style: {
      theme_layout: "minimal_center",
      theme_spacing: "generous",
      font_family: "Playfair Display",
      background_color: "#F8F9FA",
      button_color: "#BCA37F",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#111111"
    }
  },
  {
    id: "prem-event-party",
    name: "Sunset",
    description: "Vibrante para celebraciones.",
    family: "events",
    tier: "premium",
    style: {
      theme_layout: "cover_overlap",
      theme_spacing: "compact",
      font_family: "Poppins",
      background_color: "linear-gradient(135deg, #FB7185, #FDBA74)",
      button_color: "#FFFFFF",
      button_text_color: "#E11D48",
      button_radius: "full",
      button_style: "solid",
      avatar_shape: "circle",
      title_color: "#FFFFFF"
    }
  },
  {
    id: "prem-event-invite",
    name: "Invite",
    description: "Claro y organizado.",
    family: "events",
    tier: "premium",
    style: {
      theme_layout: "professional_card",
      theme_surface: "#FFFFFF",
      theme_spacing: "standard",
      font_family: "Urbanist",
      background_color: "#F1F5F9",
      button_color: "#3B82F6",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
      avatar_shape: "square"
    }
  }
];
`;

fs.writeFileSync(file, content);
console.log("Replaced template-presets.ts");
