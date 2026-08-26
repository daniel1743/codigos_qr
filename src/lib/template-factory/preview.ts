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
 *
 * This is the single source of truth for preview rendering.
 * Both the admin TemplateDetailModal and any future screenshot
 * pipeline must go through this function.
 */
export function templateConfigToPreviewData(config: TemplateConfig): CleanPreviewData {
  const a = config.appearance;
  const l = config.layout;
  const id = config.identity;

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
    title_size: String(l.titleSize || 24),
    bio_color: a.textSubtitle || null,

    // Background
    background_color: a.bgStart || "#1a1a2e",

    // Buttons
    button_color: a.btnBgStart || "#6C63FF",
    button_text_color: a.btnTextColor || "#FFFFFF",
    button_radius: mapBtnRadius(a.btnRadius),
    button_style: "solid",

    // Avatar shape
    avatar_shape: mapAvatarShape(a.profileRadius),
    ring_enabled: l.profileBorder > 0,
    ring_color: a.profileBorderColor || "#ffffff",
    ring_thickness: l.profileBorder >= 4 ? "medium" : "thin",

    // Layout hints
    theme_layout: l.devicePreview || "default",

    // Footer
    footer_enabled: !!config.content.footerText,
    footer_text: config.content.footerText || null,

    // Banner
    social_covers_enabled: a.banner.enabled,
    social_cover_style: a.banner.style || null,
    social_cover_height: a.banner.height || null,

    // Misc
    scan_count: 0,
    published: false,
  };

  // --- Links mapping ---
  const links: Partial<ProfileLink>[] = (config.links || []).map(
    (link, index) => ({
      id: "preview-link-" + index,
      profile_id: profile.id!,
      platform: link.platform || "website",
      label: link.label || "",
      subtitle: link.subtitle || null,
      url: link.url || "#",
      icon_key: link.iconKey || null,
      sort_order: index,
      enabled: true,
    })
  );

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

function mapAvatarShape(radius?: string): "circle" | "rounded" | "none" {
  if (!radius) return "circle";
  const r = radius.toLowerCase();
  if (r.includes("full") || r === "9999px" || r === "50%") return "circle";
  if (r === "0" || r === "0px" || r === "none") return "none";
  return "rounded";
}
