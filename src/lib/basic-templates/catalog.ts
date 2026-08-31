import type {
  ButtonStyleConfig,
  FontPairConfig,
  PaletteConfig,
  TemplateDefinition,
} from "@/types/basic-templates";

/* ------------------------------------------------------------------ */
/* Shared visual customization registries (referenced by templates)    */
/* ------------------------------------------------------------------ */

export const PALETTES = {
  blush: {
    id: "blush",
    name: "Blush",
    background: "#FDF6F3",
    surface: "#FFFFFF",
    text: "#3B2A2A",
    textMuted: "#8A6E6E",
    accent: "#C98A7D",
    accentText: "#FFFFFF",
  },
  rose: {
    id: "rose",
    name: "Rosa",
    background: "#FBF0F4",
    surface: "#FFFFFF",
    text: "#3A2430",
    textMuted: "#9C7088",
    accent: "#B76E9E",
    accentText: "#FFFFFF",
  },
  cream: {
    id: "cream",
    name: "Crema",
    background: "#FAF6EE",
    surface: "#FFFFFF",
    text: "#37301F",
    textMuted: "#8C8266",
    accent: "#A98A5B",
    accentText: "#FFFFFF",
  },
  noir: {
    id: "noir",
    name: "Noir",
    background: "#141214",
    surface: "#1E1B1F",
    text: "#F4EFEA",
    textMuted: "#A99F97",
    accent: "#C9A96A",
    accentText: "#14100A",
  },
  ivory: {
    id: "ivory",
    name: "Marfil",
    background: "#F6F2EC",
    surface: "#FFFFFF",
    text: "#211D1A",
    textMuted: "#857B72",
    accent: "#9C7A3C",
    accentText: "#FFFFFF",
  },
  slate: {
    id: "slate",
    name: "Slate",
    background: "#F5F7FA",
    surface: "#FFFFFF",
    text: "#1A2433",
    textMuted: "#64748B",
    accent: "#1E3A5F",
    accentText: "#FFFFFF",
  },
  navy: {
    id: "navy",
    name: "Navy",
    background: "#FFFFFF",
    surface: "#F4F6F9",
    text: "#16233A",
    textMuted: "#5B6B82",
    accent: "#0F2E4E",
    accentText: "#FFFFFF",
  },
} satisfies Record<string, PaletteConfig>;

export const FONT_PAIRS = {
  "serif-elegant": {
    id: "serif-elegant",
    name: "Serif Elegante",
    heading: "Georgia, 'Times New Roman', serif",
    body: "Inter, system-ui, sans-serif",
  },
  "sans-modern": {
    id: "sans-modern",
    name: "Sans Moderna",
    heading: "Inter, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif",
  },
} satisfies Record<string, FontPairConfig>;

export const BUTTON_STYLES = {
  "pill-solid": { id: "pill-solid", name: "Píldora sólida", shape: "pill", variant: "solid" },
  "square-solid": { id: "square-solid", name: "Cuadrado", shape: "sharp", variant: "solid" },
  "rounded-solid": {
    id: "rounded-solid",
    name: "Redondeado",
    shape: "rounded",
    variant: "solid",
  },
  "rounded-soft": {
    id: "rounded-soft",
    name: "Redondeada suave",
    shape: "rounded",
    variant: "soft",
  },
  "sharp-outline": {
    id: "sharp-outline",
    name: "Recta contorno",
    shape: "sharp",
    variant: "outline",
  },
  "premium-soft": {
    id: "premium-soft",
    name: "Premium",
    shape: "premium-soft",
    variant: "soft",
  },
} satisfies Record<string, ButtonStyleConfig>;

/* ------------------------------------------------------------------ */
/* Template catalog                                                    */
/* ------------------------------------------------------------------ */

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "beauty-curve",
    name: "Beauty Curve",
    family: "hero_profile",
    description: "Hero fotográfico con borde inferior curvo y avatar superpuesto limpio.",
    visualDirection: [
      "hero fotográfico",
      "borde inferior curvo",
      "avatar superpuesto limpio",
      "estética beauty / personal brand",
      "botones suaves",
      "tipografía elegante",
    ],
    structure: {
      family: "hero_profile",
      heroStyle: "curved",
      layout: "locked",
      locked: ["curva", "posición avatar", "layout", "espaciado estructural"],
    },
    editable: [
      { key: "avatar", label: "Avatar", type: "avatar" },
      { key: "name", label: "Nombre", type: "name" },
      { key: "subtitle", label: "Profesión / subtítulo", type: "subtitle" },
      { key: "bio", label: "Biografía", type: "bio" },
      { key: "hero", label: "Imagen hero", type: "hero" },
      { key: "socials", label: "Redes sociales", type: "socials" },
      { key: "links", label: "Enlaces", type: "links" },
    ],
    customization: {
      palettes: [PALETTES.blush, PALETTES.rose, PALETTES.cream],
      fontPairs: [FONT_PAIRS["serif-elegant"], FONT_PAIRS["sans-modern"]],
      buttonStyles: [
        BUTTON_STYLES["pill-solid"],
        BUTTON_STYLES["square-solid"],
        BUTTON_STYLES["rounded-solid"],
        BUTTON_STYLES["premium-soft"],
      ],
    },
    supportsCards: false,
    supportsContact: false,
    maxCards: 0,
  },
  {
    id: "luxury-fusion",
    name: "Luxury Fusion",
    family: "hero_profile",
    description: "Hero grande con transición fusionada al fondo y avatar separado de la máscara.",
    visualDirection: [
      "hero grande",
      "transición fusionada con background",
      "avatar totalmente separado de la máscara",
      "aspecto premium/editorial",
      "contraste elegante",
    ],
    structure: {
      family: "hero_profile",
      heroStyle: "fusion",
      layout: "locked",
      locked: ["fusion geometry", "avatar position", "layout"],
    },
    editable: [
      { key: "avatar", label: "Avatar", type: "avatar" },
      { key: "name", label: "Nombre", type: "name" },
      { key: "subtitle", label: "Subtítulo", type: "subtitle" },
      { key: "bio", label: "Biografía", type: "bio" },
      { key: "hero", label: "Hero", type: "hero" },
      { key: "socials", label: "Redes sociales", type: "socials" },
      { key: "links", label: "Enlaces", type: "links" },
    ],
    customization: {
      palettes: [PALETTES.noir, PALETTES.ivory],
      fontPairs: [FONT_PAIRS["serif-elegant"], FONT_PAIRS["sans-modern"]],
      buttonStyles: [
        BUTTON_STYLES["rounded-soft"],
        BUTTON_STYLES["square-solid"],
        BUTTON_STYLES["rounded-solid"],
        BUTTON_STYLES["pill-solid"],
        BUTTON_STYLES["premium-soft"],
      ],
    },
    supportsCards: false,
    supportsContact: false,
    maxCards: 0,
  },

  {
    id: "beauty-catalog",
    name: "Beauty Catalog",
    family: "hero_cards",
    description: "Hero, avatar y cards verticales con imagen y CTA por card.",
    visualDirection: [
      "hero",
      "avatar",
      "social buttons",
      "cards verticales con imagen",
      "CTA por card",
    ],
    structure: {
      family: "hero_cards",
      heroStyle: "straight",
      layout: "locked",
      locked: ["grid de cards", "posición avatar", "layout"],
    },
    editable: [
      { key: "avatar", label: "Avatar", type: "avatar" },
      { key: "name", label: "Nombre", type: "name" },
      { key: "subtitle", label: "Subtítulo", type: "subtitle" },
      { key: "bio", label: "Biografía", type: "bio" },
      { key: "hero", label: "Hero", type: "hero" },
      { key: "socials", label: "Redes sociales", type: "socials" },
      { key: "cards", label: "Cards", type: "cards" },
    ],
    customization: {
      palettes: [PALETTES.blush, PALETTES.rose],
      fontPairs: [FONT_PAIRS["sans-modern"], FONT_PAIRS["serif-elegant"]],
      buttonStyles: [
        BUTTON_STYLES["rounded-soft"],
        BUTTON_STYLES["square-solid"],
        BUTTON_STYLES["rounded-solid"],
        BUTTON_STYLES["pill-solid"],
        BUTTON_STYLES["premium-soft"],
      ],
    },
    supportsCards: true,
    supportsContact: false,
    maxCards: 6,
  },
  {
    id: "executive-straight",
    name: "Executive Straight",
    family: "professional_corporate",
    description: "Hero recto, estructura limpia y corporativa con información clara.",
    visualDirection: [
      "hero recto",
      "estructura limpia",
      "profesional",
      "corporativo moderno",
      "información clara",
      "botones sobrios",
    ],
    structure: {
      family: "professional_corporate",
      heroStyle: "straight",
      layout: "locked",
      locked: ["hero recto", "layout", "orden de secciones"],
    },
    editable: [
      { key: "avatar", label: "Avatar", type: "avatar" },
      { key: "name", label: "Nombre", type: "name" },
      { key: "subtitle", label: "Cargo / subtítulo", type: "subtitle" },
      { key: "bio", label: "Biografía", type: "bio" },
      { key: "hero", label: "Hero", type: "hero" },
      { key: "links", label: "Enlaces", type: "links" },
      { key: "contact", label: "Contacto", type: "contact" },
    ],
    customization: {
      palettes: [PALETTES.slate, PALETTES.navy],
      fontPairs: [FONT_PAIRS["sans-modern"]],
      buttonStyles: [
        BUTTON_STYLES["sharp-outline"],
        BUTTON_STYLES["square-solid"],
        BUTTON_STYLES["rounded-solid"],
        BUTTON_STYLES["pill-solid"],
        BUTTON_STYLES["premium-soft"],
      ],
    },
    supportsCards: false,
    supportsContact: true,
    maxCards: 0,
  },
  {
    id: "amanda",
    name: "Amanda",
    family: "standalone",
    description: "Hero con avatar circular superpuesto, CTA principal y botones sociales en dos columnas.",
    visualDirection: [
      "hero fotográfico",
      "avatar circular superpuesto",
      "CTA principal",
      "botones sociales en dos columnas",
      "footer",
    ],
    structure: {
      family: "standalone",
      heroStyle: "straight",
      layout: "locked",
      locked: ["layout", "diseño"],
    },
    editable: [
      { key: "avatar", label: "Avatar", type: "avatar" },
      { key: "name", label: "Nombre", type: "name" },
      { key: "subtitle", label: "Profesión", type: "subtitle" },
      { key: "bio", label: "Descripción", type: "bio" },
      { key: "hero", label: "Imagen de fondo", type: "hero" },
      { key: "links", label: "Enlaces", type: "links" },
    ],
    customization: {
      palettes: [PALETTES.blush],
      fontPairs: [FONT_PAIRS["sans-modern"]],
      buttonStyles: [BUTTON_STYLES["pill-solid"]],
    },
    supportsCards: false,
    supportsContact: false,
    maxCards: 0,
  },
  {
    id: "adriana",
    name: "Adriana",
    family: "standalone",
    description: "Fondo claro, logo circular, nombre centrado y botones verticales con iconos.",
    visualDirection: [
      "fondo claro",
      "logo circular",
      "nombre centrado",
      "botones verticales con iconos",
      "footer",
    ],
    structure: {
      family: "standalone",
      heroStyle: "straight",
      layout: "locked",
      locked: ["layout", "diseño"],
    },
    editable: [
      { key: "avatar", label: "Avatar", type: "avatar" },
      { key: "name", label: "Nombre", type: "name" },
      { key: "subtitle", label: "Profesión", type: "subtitle" },
      { key: "bio", label: "Descripción", type: "bio" },
      { key: "hero", label: "Imagen de fondo", type: "hero" },
      { key: "links", label: "Enlaces", type: "links" },
    ],
    customization: {
      palettes: [PALETTES.rose],
      fontPairs: [FONT_PAIRS["sans-modern"]],
      buttonStyles: [BUTTON_STYLES["pill-solid"]],
    },
    supportsCards: false,
    supportsContact: false,
    maxCards: 0,
  },
  {
    id: "eudora",
    name: "Eudora",
    family: "standalone",
    description: "Fondo orgánico malva/rosa, identidad superior, avatar circular y botones en dos columnas.",
    visualDirection: [
      "fondo orgánico",
      "identidad superior",
      "avatar circular",
      "CTA central",
      "botones en dos columnas",
      "footer",
    ],
    structure: {
      family: "standalone",
      heroStyle: "straight",
      layout: "locked",
      locked: ["layout", "diseño"],
    },
    editable: [
      { key: "avatar", label: "Avatar", type: "avatar" },
      { key: "name", label: "Nombre", type: "name" },
      { key: "subtitle", label: "Profesión", type: "subtitle" },
      { key: "bio", label: "Descripción", type: "bio" },
      { key: "hero", label: "Imagen de fondo", type: "hero" },
      { key: "links", label: "Enlaces", type: "links" },
    ],
    customization: {
      palettes: [PALETTES.rose],
      fontPairs: [FONT_PAIRS["sans-modern"]],
      buttonStyles: [BUTTON_STYLES["rounded-solid"]],
    },
    supportsCards: false,
    supportsContact: false,
    maxCards: 0,
  },
  {
    id: "barbara",
    name: "Barbara",
    family: "standalone",
    description: "Hero teal con persona, branding y redes; fondo crema y cards de servicios 72% contenido / 28% imagen.",
    visualDirection: [
      "hero teal con persona",
      "branding y redes",
      "fondo crema",
      "cards de servicios con imagen",
      "footer",
    ],
    structure: {
      family: "standalone",
      heroStyle: "straight",
      layout: "locked",
      locked: ["layout", "diseño"],
    },
    editable: [
      { key: "avatar", label: "Avatar", type: "avatar" },
      { key: "name", label: "Nombre", type: "name" },
      { key: "subtitle", label: "Profesión", type: "subtitle" },
      { key: "bio", label: "Descripción", type: "bio" },
      { key: "hero", label: "Imagen de fondo", type: "hero" },
      { key: "cards", label: "Cards de servicios", type: "cards" },
    ],
    customization: {
      palettes: [PALETTES.slate],
      fontPairs: [FONT_PAIRS["sans-modern"]],
      buttonStyles: [BUTTON_STYLES["rounded-solid"]],
    },
    supportsCards: true,
    supportsContact: false,
    maxCards: 4,
  },
];

const TEMPLATE_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): TemplateDefinition {
  const tpl = TEMPLATE_BY_ID.get(id);
  if (!tpl) throw new Error(`Unknown template id: ${id}`);
  return tpl;
}

export function getTemplates(): TemplateDefinition[] {
  return TEMPLATES;
}
