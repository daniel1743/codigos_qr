/**
 * TF-F8: Clean Template Preview Pipeline
 *
 * Maps TemplateConfig (generator output) → { profile, links } compatible
 * with PublicProfileView. This guarantees that preview and production pages
 * use the SAME shared renderer — no Canvas Engine studio chrome.
 */

import type { Profile, ProfileLink } from "../../types/database";
import type { TemplateConfig } from "./config";

/**
 * The result of mapping a TemplateConfig to the renderer's native props.
 * Feed this directly into <PublicProfileView profile={...} links={...} />.
 */
export interface CleanPreviewData {
  profile: Partial<Profile>;
  links: Partial<ProfileLink>[];
}

/**
 * Converts a TemplateConfig (stored in template_bank.config_json)
 * into the { profile, links } shape that PublicProfileView expects.
 */
export function templateConfigToPreviewData(config: TemplateConfig): CleanPreviewData {
  const a = config.appearance;
  const l = config.layout;
  const id = config.identity;
  const buttonStyle = mapBtnStyle(a.btnPresetId);
  const contentAlign = mapContentAlign(config);
  const themeLayout = mapThemeLayout(config);
  const socialCoverStyle = mapSocialCoverStyle(config);

  // Infer gradient if start and end differ
  let bgColor = a.bgStart || "#1a1a2e";
  if (a.bgStart && a.bgEnd && a.bgStart !== a.bgEnd) {
    const angle = a.bgAngle || 180;
    bgColor = `linear-gradient(${angle}deg, ${a.bgStart}, ${a.bgMid ? a.bgMid + ", " : ""}${a.bgEnd})`;
  }

  // Infer premium decorations based on palette/theme
  let decorParticles: string | null = null;
  let decorShape: string | null = null;
  let decorSmoke: string | null = null;
  const paletteId = config.paletteId || "";

  if (paletteId.includes("gold") || paletteId.includes("luxury")) {
    decorParticles = "dots";
    decorSmoke = "soft";
  } else if (paletteId.includes("executive") || paletteId.includes("platinum")) {
    decorShape = "lines";
  } else if (paletteId.includes("creator") || paletteId.includes("athletic")) {
    decorShape = "mixed";
  }

  // --- Profile mapping ---
  const profile: Partial<Profile> = {
    id: "preview-" + Date.now(),
    display_name: id.titleText || "Preview",
    bio: id.subtitleText || null,
    avatar_url: id.profileImg || null,
    banner_url: id.bannerImg || null,

    // Typography
    font_family: a.fontBody || "Inter",
    title_color: a.textPrimary || null,
    title_size: mapTitleSize(l.titleSize),
    title_weight: mapTitleWeight(config),
    title_align: contentAlign,
    bio_color: a.textSubtitle || null,
    bio_size: mapBioSize(l.titleSize),
    bio_weight: a.btnPresetId === "minimal" ? "light" : "normal",
    bio_align: contentAlign,

    // Background
    background_color: bgColor,

    // Buttons
    button_color: a.btnBgStart || "#6C63FF",
    button_text_color: a.btnTextColor || "#FFFFFF",
    button_radius: mapBtnRadius(a.btnRadius),
    button_style: buttonStyle,
    button_text_size: l.gridCols === 2 ? "sm" : "md",
    button_text_weight: a.btnPresetId === "premium" ? "bold" : "semibold",
    button_content_align: contentAlign,
    button_icon_position: buttonStyle === "line" || contentAlign === "right" ? "right" : "left",

    // Avatar shape
    avatar_shape: mapAvatarShape(a.profileRadius),
    ring_enabled: l.profileBorder > 0,
    ring_color: a.profileBorderColor || "#ffffff",
    ring_thickness: l.profileBorder >= 4 ? "medium" : "thin",

    // Decorations
    decor_particles: decorParticles,
    decor_shape: decorShape,
    decor_smoke: decorSmoke,
    decor_shadow: "soft",
    decor_intensity: "medium",

    // Layout hints
    theme_layout: themeLayout,
    theme_spacing: mapThemeSpacing(config),

    // Footer
    footer_enabled: !!config.content.footerText,
    footer_text: config.content.footerText || null,

    // Banner
    social_covers_enabled: shouldEnableSocialCovers(config),
    social_cover_style: socialCoverStyle,
    social_cover_height: mapSocialCoverHeight(config),
    social_cover_width: mapSocialCoverWidth(config),

    // Misc
    scan_count: 0,
    published: false,
  };

  // --- Links mapping ---
  const links: Partial<ProfileLink>[] = (config.links || []).map((link, index) => ({
    id: "preview-link-" + index,
    profile_id: profile.id!,
    platform: mapActionPlatform(link.actionType),
    label: link.text || "",
    subtitle: null,
    url: link.url || "#",
    icon_key: link.icon || null,
    social_cover_image_mode: "platform_icon",
    sort_order: index,
    enabled: true,
  }));

  return { profile, links };
}

// --- Helpers ---

function mapBtnRadius(radius?: string): "none" | "rounded" | "full" {
  if (!radius) return "rounded";
  const r = radius.toLowerCase();
  if (r === "0" || r === "0px" || r === "none") return "none";
  if (r.includes("full") || r === "9999px" || r === "999px") return "full";
  return "rounded";
}

function mapAvatarShape(radius?: string): "circle" | "rounded" | "none" | "square" {
  if (!radius) return "circle";
  const r = radius.toLowerCase();
  if (r.includes("full") || r === "9999px" || r === "50%") return "circle";
  if (r === "0" || r === "0px" || r === "none") return "square"; // 0px means square
  return "rounded";
}

function mapBtnStyle(
  presetId?: string,
): NonNullable<Profile["button_style"]> {
  if (!presetId) return "solid";
  const id = presetId.toLowerCase();
  if (id.includes("outline")) return "outline";
  if (id.includes("soft")) return "soft";
  if (id.includes("glass")) return "card";
  if (id.includes("minimal")) return "minimal";
  if (id.includes("premium")) return "premium_classic_card";
  return "solid";
}

function mapContentAlign(config: TemplateConfig): "left" | "center" | "right" {
  if (config.layout.gridCols === 2) return "left";
  if (config.appearance.btnPresetId === "minimal") return "left";
  if (config.appearance.profileRadius === "0px") return "left";
  return "center";
}

function mapThemeLayout(config: TemplateConfig): string {
  const hasBanner = Boolean(config.identity.bannerImg && config.appearance.banner.enabled);
  const isGrid = config.layout.gridCols === 2;
  const isSquareAvatar = config.appearance.profileRadius === "0px";
  const isDark = config.appearance.textPrimary.toLowerCase() === "#ffffff";

  if (isGrid && hasBanner) return "professional_card";
  if (isGrid) return "minimal_center";
  if (hasBanner && isSquareAvatar) return "editorial_left";
  if (hasBanner) return "cover_overlap";
  if (isDark && config.appearance.btnPresetId === "minimal") return "dark_statement";
  return "classic_center";
}

function mapThemeSpacing(config: TemplateConfig): string {
  if (config.links.length <= 2) return "generous";
  if (config.layout.gridCols === 2 || config.links.length >= 5) return "compact";
  return "standard";
}

function mapTitleSize(titleSize?: number): string {
  if (!titleSize) return "lg";
  if (titleSize >= 2.45) return "xl";
  if (titleSize >= 2.1) return "lg";
  if (titleSize >= 1.9) return "md";
  return "sm";
}

function mapBioSize(titleSize?: number): string {
  if (!titleSize) return "md";
  if (titleSize >= 2.45) return "lg";
  if (titleSize <= 1.9) return "sm";
  return "md";
}

function mapTitleWeight(config: TemplateConfig): string {
  if (config.appearance.btnPresetId === "minimal") return "light";
  if (config.paletteId?.includes("editorial")) return "normal";
  if (config.appearance.btnPresetId === "premium") return "bold";
  return "semibold";
}

function shouldEnableSocialCovers(config: TemplateConfig): boolean {
  return config.socials.enabled && config.socials.items.length > 0 && config.links.length <= 4;
}

function mapSocialCoverStyle(config: TemplateConfig): string | null {
  if (!shouldEnableSocialCovers(config)) return null;
  const preset = config.appearance.btnPresetId;
  const paletteId = config.paletteId || "";

  if (paletteId.includes("neon") || paletteId.includes("electric")) return "neon_lumen";
  if (paletteId.includes("gold") || paletteId.includes("bronze")) return "metal_coin";
  if (preset === "premium") return "raised_gloss";
  if (preset === "glass") return "glass_orbit";
  if (preset === "outline") return "angled_tab";
  if (preset === "minimal") return "split_capsule";
  return "badge_left";
}

function mapSocialCoverHeight(config: TemplateConfig): number | null {
  if (!shouldEnableSocialCovers(config)) return null;
  if (config.appearance.banner.heightPreset === "large") return 76;
  if (config.appearance.banner.heightPreset === "compact") return 60;
  return config.appearance.btnPresetId === "premium" ? 72 : 68;
}

function mapSocialCoverWidth(config: TemplateConfig): number | null {
  if (!shouldEnableSocialCovers(config)) return null;
  if (config.layout.gridCols === 2) return 92;
  if (config.links.length <= 2) return 108;
  return 100;
}

function mapActionPlatform(actionType?: string): string {
  switch (actionType) {
    case "whatsapp":
      return "whatsapp";
    case "email":
      return "email";
    case "phone":
      return "other";
    case "location":
      return "website";
    default:
      return "website";
  }
}
