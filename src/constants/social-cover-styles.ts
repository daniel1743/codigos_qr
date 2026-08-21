// Modified by Antigravity — QR-UI-17E
export type SocialCoverStyle =
  | "badge_left"
  | "split_capsule"
  | "ribbon_label"
  | "avatar_capsule"
  | "solid_subscribe"
  | "raised_gloss"
  | "heart_badge"
  | "angled_tab"
  | "leaf_outline"
  | "metal_coin"
  | "neon_lumen"
  | "glass_orbit";

export const DEFAULT_SOCIAL_COVER_STYLE: SocialCoverStyle = "badge_left";

export const SOCIAL_COVER_STYLE_OPTIONS: Array<{
  id: SocialCoverStyle;
  label: string;
  hint: string;
}> = [
  { id: "badge_left", label: "Badge Left", hint: "Medallón lateral y cuerpo principal" },
  { id: "split_capsule", label: "Split Capsule", hint: "Separación zona de identidad/contenido" },
  { id: "ribbon_label", label: "Ribbon Label", hint: "Etiqueta visual con corte asimétrico" },
  { id: "avatar_capsule", label: "Avatar Capsule", hint: "Avatar integrado + badge red social" },
  { id: "solid_subscribe", label: "Solid Subscribe", hint: "Pastilla sólida con relieve inferior" },
  { id: "raised_gloss", label: "Raised Gloss", hint: "Cápsula 3D con brillo premium" },
  { id: "heart_badge", label: "Heart Badge", hint: "Insignia lateral tipo corazón" },
  { id: "angled_tab", label: "Angled Tab", hint: "Pestaña diagonal con borde fino" },
  { id: "leaf_outline", label: "Leaf Outline", hint: "Lower third blanco con curva elegante" },
  { id: "metal_coin", label: "Metal Coin", hint: "Medalla metálica y barra intensa" },
  { id: "neon_lumen", label: "Neon Lumen", hint: "Fondo oscuro con brillo de color" },
  { id: "glass_orbit", label: "Glass Orbit", hint: "Cristal suave con aro de identidad" },
];

// Modified by Codex — SOCIAL-BADGES-IMAGE-MODE
export const SOCIAL_COVER_STYLE_REGISTRY_LIMIT = 16;

export const RESERVED_SOCIAL_COVER_STYLE_IDS = [
  "premium_style_13",
  "premium_style_14",
  "premium_style_15",
  "premium_style_16",
] as const;

export function normalizeSocialCoverStyle(value?: string | null): SocialCoverStyle {
  return SOCIAL_COVER_STYLE_OPTIONS.some((option) => option.id === value)
    ? (value as SocialCoverStyle)
    : DEFAULT_SOCIAL_COVER_STYLE;
}
