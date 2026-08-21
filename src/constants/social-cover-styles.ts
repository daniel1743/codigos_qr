// Modified by Antigravity — QR-UI-17E
export type SocialCoverStyle = "badge_left" | "split_capsule" | "ribbon_label" | "avatar_capsule";

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
];

// Modified by Codex — SOCIAL-BADGES-IMAGE-MODE
export const SOCIAL_COVER_STYLE_REGISTRY_LIMIT = 16;

export const RESERVED_SOCIAL_COVER_STYLE_IDS = [
  "premium_style_05",
  "premium_style_06",
  "premium_style_07",
  "premium_style_08",
  "premium_style_09",
  "premium_style_10",
  "premium_style_11",
  "premium_style_12",
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
