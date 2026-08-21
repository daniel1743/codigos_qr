export type PremiumMediaLayoutId =
  | "media_noir_gallery"
  | "media_rose_atelier"
  | "media_cobalt_editorial"
  | "media_citrus_ledger"
  | "media_aqua_glass"
  | "media_terracotta_studio"
  | "media_sage_maison"
  | "media_violet_club"
  | "media_midnight_neon"
  | "media_scarlet_journal"
  | "media_sandstone_luxe"
  | "media_ocean_grid";

export interface PremiumMediaLayout {
  id: PremiumMediaLayoutId;
  mediaPosition: "left" | "right";
  mediaShape: "square" | "soft" | "round";
  cardBackground: string;
  cardBorder: string;
  cardShadow: string;
  mediaBackground: string;
  mediaBorder: string;
  contentColor: string;
  mutedColor: string;
  accentColor: string;
}

export const PREMIUM_MEDIA_LAYOUTS: Record<PremiumMediaLayoutId, PremiumMediaLayout> = {
  media_noir_gallery: {
    id: "media_noir_gallery",
    mediaPosition: "left",
    mediaShape: "square",
    cardBackground: "linear-gradient(135deg, #141b2d 0%, #202b43 100%)",
    cardBorder: "1px solid rgba(255, 255, 255, 0.12)",
    cardShadow: "0 16px 28px rgba(7, 12, 24, 0.26)",
    mediaBackground: "#f6efe3",
    mediaBorder: "1px solid rgba(255, 255, 255, 0.24)",
    contentColor: "#ffffff",
    mutedColor: "#c8d0df",
    accentColor: "#e9bb75",
  },
  media_rose_atelier: {
    id: "media_rose_atelier",
    mediaPosition: "right",
    mediaShape: "round",
    cardBackground: "linear-gradient(135deg, #fff8fa 0%, #ffe2ec 100%)",
    cardBorder: "1px solid #f4bbcd",
    cardShadow: "0 16px 26px rgba(148, 52, 88, 0.15)",
    mediaBackground: "#bd3567",
    mediaBorder: "4px solid #ffffff",
    contentColor: "#472038",
    mutedColor: "#91506d",
    accentColor: "#c93670",
  },
  media_cobalt_editorial: {
    id: "media_cobalt_editorial",
    mediaPosition: "left",
    mediaShape: "soft",
    cardBackground: "linear-gradient(135deg, #f7faff 0%, #dce9ff 100%)",
    cardBorder: "1px solid #a9c5f7",
    cardShadow: "0 16px 28px rgba(33, 81, 157, 0.16)",
    mediaBackground: "#174eab",
    mediaBorder: "1px solid #2f6ac3",
    contentColor: "#142d59",
    mutedColor: "#54719f",
    accentColor: "#1b61d1",
  },
  media_citrus_ledger: {
    id: "media_citrus_ledger",
    mediaPosition: "right",
    mediaShape: "square",
    cardBackground: "linear-gradient(135deg, #fffaf0 0%, #fff0be 100%)",
    cardBorder: "1px solid #efcb68",
    cardShadow: "0 16px 28px rgba(126, 85, 12, 0.16)",
    mediaBackground: "#29374f",
    mediaBorder: "1px solid #29374f",
    contentColor: "#272314",
    mutedColor: "#746538",
    accentColor: "#d68b13",
  },
  media_aqua_glass: {
    id: "media_aqua_glass",
    mediaPosition: "left",
    mediaShape: "round",
    cardBackground:
      "linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(221,249,247,0.96) 100%)",
    cardBorder: "1px solid rgba(30, 146, 148, 0.28)",
    cardShadow: "0 16px 28px rgba(19, 126, 128, 0.15)",
    mediaBackground: "#0f7f83",
    mediaBorder: "4px solid rgba(255, 255, 255, 0.92)",
    contentColor: "#123f45",
    mutedColor: "#46777a",
    accentColor: "#0d8f91",
  },
  media_terracotta_studio: {
    id: "media_terracotta_studio",
    mediaPosition: "right",
    mediaShape: "soft",
    cardBackground: "linear-gradient(135deg, #fff9f6 0%, #f6d9ca 100%)",
    cardBorder: "1px solid #dca48c",
    cardShadow: "0 16px 28px rgba(135, 63, 38, 0.16)",
    mediaBackground: "#b9492e",
    mediaBorder: "1px solid #9c3b24",
    contentColor: "#4e261c",
    mutedColor: "#8c5748",
    accentColor: "#b8492e",
  },
  media_sage_maison: {
    id: "media_sage_maison",
    mediaPosition: "left",
    mediaShape: "round",
    cardBackground: "linear-gradient(135deg, #fbfdf9 0%, #dcebdd 100%)",
    cardBorder: "1px solid #a8c6aa",
    cardShadow: "0 16px 28px rgba(56, 96, 62, 0.14)",
    mediaBackground: "#315f44",
    mediaBorder: "4px solid #f8fbf6",
    contentColor: "#254333",
    mutedColor: "#66826d",
    accentColor: "#3f7953",
  },
  media_violet_club: {
    id: "media_violet_club",
    mediaPosition: "right",
    mediaShape: "square",
    cardBackground: "linear-gradient(135deg, #281a4e 0%, #5637a4 100%)",
    cardBorder: "1px solid rgba(255,255,255,0.2)",
    cardShadow: "0 16px 28px rgba(40, 20, 83, 0.28)",
    mediaBackground: "#e2c5ff",
    mediaBorder: "1px solid rgba(255,255,255,0.34)",
    contentColor: "#ffffff",
    mutedColor: "#ddd1f7",
    accentColor: "#f2c85b",
  },
  media_midnight_neon: {
    id: "media_midnight_neon",
    mediaPosition: "left",
    mediaShape: "soft",
    cardBackground: "linear-gradient(135deg, #071924 0%, #0c3340 100%)",
    cardBorder: "1px solid rgba(57, 238, 205, 0.44)",
    cardShadow: "0 16px 30px rgba(3, 16, 24, 0.34)",
    mediaBackground: "#061016",
    mediaBorder: "1px solid #20d9bc",
    contentColor: "#f4fffe",
    mutedColor: "#a9d7d0",
    accentColor: "#26e1c2",
  },
  media_scarlet_journal: {
    id: "media_scarlet_journal",
    mediaPosition: "right",
    mediaShape: "round",
    cardBackground: "linear-gradient(135deg, #fff8f7 0%, #ffd9d6 100%)",
    cardBorder: "1px solid #edaaa5",
    cardShadow: "0 16px 28px rgba(162, 39, 39, 0.16)",
    mediaBackground: "#a51f2c",
    mediaBorder: "4px solid #ffffff",
    contentColor: "#551c26",
    mutedColor: "#92515a",
    accentColor: "#b52638",
  },
  media_sandstone_luxe: {
    id: "media_sandstone_luxe",
    mediaPosition: "left",
    mediaShape: "square",
    cardBackground: "linear-gradient(135deg, #fdfaf5 0%, #ede0cd 100%)",
    cardBorder: "1px solid #d6c09e",
    cardShadow: "0 16px 28px rgba(92, 66, 32, 0.14)",
    mediaBackground: "#54422e",
    mediaBorder: "1px solid #a98b5c",
    contentColor: "#392d20",
    mutedColor: "#776854",
    accentColor: "#a87b35",
  },
  media_ocean_grid: {
    id: "media_ocean_grid",
    mediaPosition: "right",
    mediaShape: "soft",
    cardBackground: "linear-gradient(135deg, #f6fcff 0%, #d7effa 100%)",
    cardBorder: "1px solid #98cde1",
    cardShadow: "0 16px 28px rgba(20, 102, 135, 0.15)",
    mediaBackground: "#075e83",
    mediaBorder: "1px solid #075e83",
    contentColor: "#07364d",
    mutedColor: "#4c788d",
    accentColor: "#0878ad",
  },
};

export function isPremiumMediaLayout(layout?: string | null): layout is PremiumMediaLayoutId {
  return !!layout && layout in PREMIUM_MEDIA_LAYOUTS;
}

export function getPremiumMediaLayout(layout: PremiumMediaLayoutId): PremiumMediaLayout {
  return PREMIUM_MEDIA_LAYOUTS[layout];
}
