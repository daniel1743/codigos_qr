import type { ProfileLink } from "../../../../types/database";
import type { TemplateConfig } from "../../../../lib/template-factory/config";
import { templateConfigToPreviewData } from "../../../../lib/template-factory/preview";
import {
  capabilityProfiles,
  clonePageConfig,
  defaultBlockStyle,
  hydratePageConfig,
  initialPageConfig,
  type LinkItem,
  type PageBlock,
  type PageConfig,
  type SocialItem,
  type SocialNetwork,
} from "./editorCandidateModel";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isPowerEditorConfig(config: unknown): config is PageConfig {
  return Boolean(config && typeof config === "object" && Array.isArray((config as PageConfig).blocks));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function linkVariant(buttonStyle?: string): LinkItem["style"]["variant"] {
  if (buttonStyle === "outline" || buttonStyle === "line") return "outline";
  if (buttonStyle === "soft") return "soft";
  if (buttonStyle === "minimal") return "minimal";
  if (buttonStyle === "card") return "glass";
  if (buttonStyle?.startsWith("premium")) return "premium";
  return "solid";
}

function radiusToPixels(radius?: string | null) {
  if (!radius || radius === "none") return 0;
  if (radius === "full") return 999;
  return 14;
}

function titleSizeToPixels(size?: string) {
  if (size === "xl") return 36;
  if (size === "lg") return 31;
  if (size === "sm") return 23;
  return 28;
}

function titleWeightToNumber(weight?: string) {
  if (weight === "light") return 400;
  if (weight === "normal") return 500;
  if (weight === "bold") return 800;
  return 700;
}

function profileImageSize(config: TemplateConfig) {
  const source = Number(config.layout?.profileSize || 160);
  return clamp(Math.round(source * 0.45), 58, 118);
}

function avatarShape(radius?: string) {
  if (radius === "0px" || radius === "0" || radius === "none") return "square";
  if (radius && radius !== "50%" && !radius.includes("999")) return "rounded";
  return "circle";
}

function socialNetwork(platform?: string | null): SocialNetwork {
  const normalized = String(platform || "").toLowerCase();
  if (["instagram", "facebook", "tiktok", "linkedin", "whatsapp", "youtube", "telegram", "email"].includes(normalized)) return normalized as SocialNetwork;
  if (normalized === "twitter") return "x";
  return "website";
}

function buildLinks(links: Partial<ProfileLink>[], profile: ReturnType<typeof templateConfigToPreviewData>["profile"]): LinkItem[] {
  const variant = linkVariant(profile.button_style);
  return links.map((link, index) => ({
    id: `link-${index + 1}`,
    label: readString(link.label, `Enlace ${index + 1}`),
    url: readString(link.url, "#"),
    icon: link.icon_key ?? null,
    enabled: link.enabled ?? true,
    style: {
      variant,
      color: profile.button_color || undefined,
      textColor: profile.button_text_color || undefined,
      radius: radiusToPixels(profile.button_radius),
      shadow: variant === "premium" ? 18 : undefined,
    },
  }));
}

function buildSocials(config: TemplateConfig): SocialItem[] {
  return (config.socials?.items ?? [])
    .filter((item) => item.enabled !== false)
    .map((item, index) => ({
      id: `social-${index + 1}`,
      network: socialNetwork(item.platform || item.iconId || item.label),
      url: readString(item.url, "#"),
      enabled: true,
    }));
}

export function templateBankConfigToPowerEditorConfig(config: unknown): PageConfig {
  if (isPowerEditorConfig(config)) return hydratePageConfig(config);

  const templateConfig = config as TemplateConfig;
  const { profile, links } = templateConfigToPreviewData(templateConfig);
  const base = clonePageConfig(initialPageConfig);
  const appearance = isRecord(templateConfig.appearance) ? templateConfig.appearance : {};
  const identity = isRecord(templateConfig.identity) ? templateConfig.identity : {};
  const content = isRecord(templateConfig.content) ? templateConfig.content : {};
  const hasBanner = Boolean(readString(identity.bannerImg) || profile.banner_url);
  const headingStyle = defaultBlockStyle();
  const textStyle = defaultBlockStyle();
  const linkStyle = defaultBlockStyle();
  linkStyle.composition.columns = Number(templateConfig.layout?.gridCols || 1);

  const blocks: PageBlock[] = [
    {
      id: "banner",
      type: "banner",
      order: 0,
      enabled: hasBanner,
      locked: false,
      name: "Banner",
      props: {
        height: templateConfig.appearance?.banner?.heightPreset === "large" ? 156 : templateConfig.appearance?.banner?.heightPreset === "compact" ? 96 : 126,
        imageUrl: readString(identity.bannerImg, profile.banner_url || ""),
        imageOpacity: Number(templateConfig.appearance?.banner?.imageOpacity ?? 100),
        overlayColor: readString(appearance.bgStart, "#11141c"),
        overlayOpacity: Number(templateConfig.appearance?.bgOverlay ?? 25),
        blend: "soft",
        blendStrength: 40,
        fusionMode: templateConfig.appearance?.banner?.fusionPreset || "soft",
        fusionDepth: 46,
        fusionStrength: Number(templateConfig.appearance?.banner?.fusionStrength ?? 80),
        fit: "cover",
        positionX: 50,
        positionY: Number(templateConfig.appearance?.banner?.positionY ?? 50),
        radius: 0,
        style: defaultBlockStyle(),
      },
    },
    {
      id: "profile",
      type: "profile",
      order: 1,
      enabled: true,
      name: "Perfil",
      props: {
        logo: readString(identity.logoText),
        logoUrl: "",
        logoWidth: clamp(Number(templateConfig.layout?.logoSize || 3) * 44, 92, 190),
        logoAlign: profile.title_align || "center",
        logoOpacity: 100,
        logoFit: "contain",
        logoRadius: 0,
        initials: readString(profile.display_name, "QR").slice(0, 2).toUpperCase(),
        avatarUrl: profile.avatar_url || readString(identity.profileImg),
        size: profileImageSize(templateConfig),
        shape: avatarShape(templateConfig.appearance?.profileRadius),
        borderWidth: Number(templateConfig.layout?.profileBorder || 0),
        borderColor: profile.ring_color || readString(appearance.profileBorderColor, "#c49a68"),
        shadow: 18,
        align: profile.title_align || "center",
        verticalPosition: hasBanner ? "transition" : "body",
        overlap: hasBanner ? 36 : 0,
        style: defaultBlockStyle(),
      },
    },
    {
      id: "heading",
      type: "heading",
      order: 2,
      enabled: true,
      name: "Título",
      props: {
        text: readString(profile.display_name, readString(identity.titleText, "Nueva plantilla")),
        align: profile.title_align || "center",
        fontFamily: readString(appearance.fontHeading, profile.font_family || base.theme.fontFamily),
        fontSize: titleSizeToPixels(profile.title_size),
        fontWeight: titleWeightToNumber(profile.title_weight),
        color: profile.title_color || readString(appearance.textPrimary, base.theme.titleColor),
        letterSpacing: 0,
        lineHeight: 1.1,
        style: headingStyle,
      },
    },
    {
      id: "subtitle",
      type: "text",
      order: 3,
      enabled: Boolean(profile.bio || identity.subtitleText),
      name: "Subtítulo",
      props: {
        text: readString(profile.bio, readString(identity.subtitleText)),
        align: profile.bio_align || profile.title_align || "center",
        fontFamily: readString(appearance.fontSubtitle, profile.font_family || base.theme.fontFamily),
        color: profile.bio_color || readString(appearance.textSubtitle, "rgba(245,245,245,.69)"),
        style: textStyle,
      },
    },
    {
      id: "links",
      type: "links",
      order: 4,
      enabled: links.length > 0,
      name: "Enlaces",
      props: {
        layout: Number(templateConfig.layout?.gridCols || 1),
        linkStyleMode: "individual",
        items: buildLinks(links, profile),
        style: linkStyle,
      },
    },
    {
      id: "socials",
      type: "socials",
      order: 5,
      enabled: Boolean(templateConfig.socials?.enabled && templateConfig.socials.items?.length),
      name: "Redes",
      props: {
        align: profile.title_align || "center",
        gap: 10,
        size: 18,
        color: profile.bio_color || "#c9cbd0",
        socialStyle: templateConfig.socials?.displayMode || "simple",
        items: buildSocials(templateConfig),
        style: defaultBlockStyle(),
      },
    },
    {
      id: "footer",
      type: "footer",
      order: 6,
      enabled: Boolean(content.footerText || profile.footer_text),
      name: "Footer",
      props: {
        topText: "",
        bottomText: readString(content.footerText, profile.footer_text || ""),
        align: "center",
        fontFamily: "DM Mono",
        fontSize: 7,
        color: "rgba(255,255,255,.45)",
        opacity: 80,
        divider: false,
        preset: "minimal",
        style: defaultBlockStyle(),
      },
    },
  ];

  return hydratePageConfig({
    ...base,
    version: 5,
    profile: "premium",
    capabilities: capabilityProfiles.premium,
    palette: { selectedId: templateConfig.paletteId },
    theme: {
      ...base.theme,
      fontFamily: readString(appearance.fontBody, profile.font_family || base.theme.fontFamily),
      titleColor: profile.title_color || readString(appearance.textPrimary, base.theme.titleColor),
      fontSize: titleSizeToPixels(profile.title_size),
      fontWeight: titleWeightToNumber(profile.title_weight),
      buttonColor: profile.button_color || readString(appearance.btnBgStart, base.theme.buttonColor),
      buttonRadius: radiusToPixels(profile.button_radius),
    },
    background: {
      ...base.background,
      base: readString(appearance.bgStart, profile.background_color || base.background.base),
      gradientEnd: readString(appearance.bgEnd, base.background.gradientEnd),
      gradient: Boolean(appearance.bgStart && appearance.bgEnd && appearance.bgStart !== appearance.bgEnd),
      angle: Number(appearance.bgAngle ?? base.background.angle),
      pattern: templateConfig.paletteId?.includes("minimal") ? "none" : base.background.pattern,
    },
    blocks,
  });
}
