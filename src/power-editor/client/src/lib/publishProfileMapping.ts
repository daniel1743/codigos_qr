import type { Profile, ProfileLink } from "../../../../types/database";
import {
  allBlocks,
  getBlockStyle,
  getLinks,
  getSocials,
  type LinkItem,
  type PageBlock,
  type PageConfig,
  type SocialItem,
} from "./editorCandidateModel";

export type PowerEditorProfilePayload = {
  profile: Partial<Profile>;
  links: Array<Partial<ProfileLink> & { platform: string; label: string; url: string }>;
};

function textFrom(block?: PageBlock, fallback: string | null = "") {
  const value = block?.props.text ?? fallback;
  return value === null ? "" : String(value).trim();
}

function stringProp(block: PageBlock | undefined, key: string, fallback = "") {
  return String(block?.props[key] ?? fallback).trim();
}

function alignProp(block: PageBlock | undefined): "left" | "center" | "right" {
  const value = String(block?.props.align ?? getBlockStyle(block).composition.align ?? "center");
  return value === "left" || value === "right" ? value : "center";
}

function radiusFrom(value: unknown): NonNullable<Profile["button_radius"]> {
  const radius = Number(value ?? 15);
  if (radius <= 2) return "none";
  if (radius >= 999 || radius >= 22) return "full";
  return "rounded";
}

function buttonStyleFrom(link?: LinkItem): NonNullable<Profile["button_style"]> {
  switch (link?.style?.variant) {
    case "outline":
      return "outline";
    case "soft":
      return "soft";
    case "minimal":
      return "minimal";
    case "glass":
      return "card";
    case "premium":
      return "premium_classic_card";
    case "image":
      return "premium_image_right";
    default:
      return "solid";
  }
}

function avatarShapeFrom(block?: PageBlock): NonNullable<Profile["avatar_shape"]> {
  const shape = String(block?.props.shape ?? "circle");
  if (shape === "square") return "square";
  if (shape === "rounded") return "rounded";
  return "circle";
}

function backgroundFrom(page: PageConfig) {
  if (!page.background.gradient) return page.background.base;
  return `linear-gradient(${page.background.angle}deg, ${page.background.base}, ${page.background.gradientEnd})`;
}

function socialPlatform(item: SocialItem) {
  return item.network === "x" ? "twitter" : item.network;
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  return trimmed || "#";
}

export function pageConfigToPublicProfilePayload(page: PageConfig): PowerEditorProfilePayload {
  const blocks = allBlocks(page).filter((block) => block.enabled);
  const banner = blocks.find((block) => block.type === "banner");
  const profileBlock = blocks.find((block) => block.type === "profile");
  const heading = blocks.find((block) => block.type === "heading");
  const subtitle = blocks.find((block) => block.type === "text");
  const linksBlock = blocks.find((block) => block.type === "links");
  const socialsBlock = blocks.find((block) => block.type === "socials");
  const footer = blocks.find((block) => block.type === "footer");
  const links = getLinks(linksBlock).filter((link) => link.enabled);
  const socials = getSocials(socialsBlock).filter((social) => social.enabled);
  const firstLink = links[0];

  return {
    profile: {
      display_name: textFrom(heading, "Mi QR"),
      bio: textFrom(subtitle, null) || null,
      avatar_url: stringProp(profileBlock, "avatarUrl") || null,
      banner_url: stringProp(banner, "imageUrl") || null,
      avatar_shape: avatarShapeFrom(profileBlock),
      ring_enabled: Number(profileBlock?.props.borderWidth ?? 0) > 0,
      ring_color: stringProp(profileBlock, "borderColor", page.theme.buttonColor),
      ring_thickness: Number(profileBlock?.props.borderWidth ?? 0) >= 4 ? "medium" : "thin",
      font_family: page.theme.fontFamily,
      background_color: backgroundFrom(page),
      button_color: firstLink?.style?.color || page.theme.buttonColor,
      button_text_color: firstLink?.style?.textColor || "#ffffff",
      button_radius: radiusFrom(firstLink?.style?.radius ?? page.theme.buttonRadius),
      button_style: buttonStyleFrom(firstLink),
      title_color: page.theme.titleColor,
      title_size: page.theme.fontSize >= 34 ? "xl" : page.theme.fontSize >= 28 ? "lg" : "md",
      title_weight: String(page.theme.fontWeight),
      title_align: alignProp(heading),
      bio_color: page.theme.titleColor,
      bio_size: "md",
      bio_weight: "normal",
      bio_align: alignProp(subtitle),
      button_text_size: "md",
      button_text_weight: "semibold",
      button_content_align: alignProp(linksBlock),
      button_icon_position: "left",
      footer_enabled: Boolean(footer),
      footer_text:
        stringProp(footer, "bottomText") || stringProp(footer, "topText") || null,
      published: true,
      theme_layout: "power_editor",
      theme_surface: page.background.texture,
      theme_spacing: page.theme.buttonGap <= 8 ? "compact" : "standard",
      decor_shape: page.background.pattern === "none" ? null : page.background.pattern,
      decor_particles: blocks.some((block) => block.type === "particles") ? "soft-dots" : null,
      decor_shadow: page.theme.titleShadow > 0 ? "soft" : null,
      decor_intensity: "medium",
      social_covers_enabled: false,
    },
    links: [
      ...links.map((link, index) => ({
        platform: "website",
        label: link.label || `Enlace ${index + 1}`,
        url: normalizeUrl(link.url),
        icon_key: link.icon ?? null,
        sort_order: index,
        enabled: true,
      })),
      ...socials.map((social, index) => ({
        platform: socialPlatform(social),
        label: social.network === "email" ? "Email" : social.network,
        url: normalizeUrl(social.url),
        icon_key: social.network,
        sort_order: links.length + index,
        enabled: true,
      })),
    ],
  };
}
