import type {
  ButtonCustomizationConfig,
  BasicTemplateConfig,
  BasicTemplateContent,
  ButtonStyleConfig,
  FontPairConfig,
  PaletteConfig,
  TemplateDefinition,
} from "@/types/basic-templates";
import type { Profile, ProfileLink } from "@/types/database";
import type { SocialPlatform } from "@/types/basic-templates";

export type ButtonCustomizationOverrides = Pick<
  Partial<Profile>,
  | "button_radius"
  | "button_style"
  | "button_border_thickness"
  | "button_border_color"
  | "button_text_size"
  | "button_text_weight"
  | "button_content_align"
  | "button_icon_position"
  | "theme_spacing"
>;

export type TemplateCustomizationOverrides = Pick<
  Partial<Profile>,
  | "background_color"
  | "button_color"
  | "button_text_color"
  | "font_family"
  | "banner_fusion_strength"
> &
  ButtonCustomizationOverrides;

export interface BuildConfigOptions {
  palette?: PaletteConfig;
  fontPair?: FontPairConfig;
  buttonStyle?: ButtonStyleConfig;
  buttonCustomization?: ButtonCustomizationOverrides;
  profileCustomization?: TemplateCustomizationOverrides;
}

function requiredOption<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Template ${label} options cannot be empty.`);
  return value;
}

const SPACING_BY_THEME = {
  compact: "0.5rem",
  standard: "0.75rem",
  generous: "1.25rem",
} as const;

const SOCIAL_PLATFORMS: ReadonlySet<SocialPlatform> = new Set([
  "instagram",
  "twitter",
  "facebook",
  "linkedin",
  "youtube",
  "tiktok",
  "whatsapp",
  "website",
]);

export const BASIC_EDITOR_FONTS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "DM Sans",
  "Manrope",
  "Raleway",
  "Nunito",
  "Lato",
  "Playfair Display",
  "Merriweather",
] as const;

const SUPPORTED_EDITOR_FONTS = new Set<string>(BASIC_EDITOR_FONTS);

function resolveSupportedFont(value: string | null | undefined) {
  const selectedFont = value?.trim();
  return selectedFont && SUPPORTED_EDITOR_FONTS.has(selectedFont) ? selectedFont : undefined;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isSupportedColorOrGradient(value: unknown): value is string {
  return (
    isHexColor(value) ||
    (typeof value === "string" && /^(linear-gradient|radial-gradient)\(/.test(value.trim()))
  );
}

function normalizeHex(value: string): string {
  return value.toLowerCase();
}

function hexToRgb(value: string): { r: number; g: number; b: number } | null {
  if (!isHexColor(value)) return null;
  const hex = value.slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function relativeLuminance(value: string): number | null {
  const rgb = hexToRgb(value);
  if (!rgb) return null;

  const linear = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  const [red = 0, green = 0, blue = 0] = linear;
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  if (firstLuminance === null || secondLuminance === null) return 0;
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveDefaultButtonBorderColor(
  palette: PaletteConfig,
  style: ButtonStyleConfig,
  borderWidth: ButtonCustomizationConfig["borderWidth"],
): string {
  if (borderWidth === 0 || style.variant !== "solid") return palette.accent;
  if (!isHexColor(palette.accent)) return isHexColor(palette.text) ? palette.text : palette.accentText;

  const accent = normalizeHex(palette.accent);
  const candidates = [
    palette.accentText,
    palette.text,
    palette.background,
    palette.surface,
    "#111111",
    "#ffffff",
  ].filter((candidate) => isHexColor(candidate) && normalizeHex(candidate) !== accent);

  const [bestColor] = candidates.sort(
    (first, second) => contrastRatio(second, palette.accent) - contrastRatio(first, palette.accent),
  );

  return bestColor ?? palette.accent;
}

function resolvePalette(
  template: TemplateDefinition,
  override: TemplateCustomizationOverrides | undefined,
): PaletteConfig {
  const fallback = requiredOption(template.customization.palettes[0], "palette");
  return {
    ...fallback,
    background: isSupportedColorOrGradient(override?.background_color)
      ? override.background_color
      : fallback.background,
    accent: isSupportedColorOrGradient(override?.button_color)
      ? override.button_color
      : fallback.accent,
    accentText: isHexColor(override?.button_text_color)
      ? override.button_text_color
      : fallback.accentText,
  };
}

function resolveFontPair(
  template: TemplateDefinition,
  override: TemplateCustomizationOverrides | undefined,
): FontPairConfig {
  const fallback = requiredOption(template.customization.fontPairs[0], "font pair");
  const selectedFont = resolveSupportedFont(override?.font_family);
  if (!selectedFont) return fallback;
  const fontStack = `${selectedFont}, system-ui, sans-serif`;
  return { id: `profile-${selectedFont}`, name: selectedFont, heading: fontStack, body: fontStack };
}

function resolveFusionStrength(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function contactValue(link: Partial<ProfileLink> | undefined, prefix: string): string {
  const value = link?.url || "";
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

/** Build the same user content for editor, full preview, and public rendering. */
export function buildBasicTemplateContent(
  profile: Partial<Profile>,
  links: Partial<ProfileLink>[],
): BasicTemplateContent {
  const normalizedLinks = links.map((link, index) => ({
    id: link.id || `profile-link-${index}`,
    label: link.label || "Enlace",
    url: link.url || "",
    enabled: link.enabled ?? true,
  }));
  const socialLinks = links.flatMap((link, index) => {
    const platform = typeof link.platform === "string" ? link.platform : "";
    if (!SOCIAL_PLATFORMS.has(platform as SocialPlatform)) return [];
    return [
      {
        id: link.id || `profile-social-${index}`,
        platform: platform as SocialPlatform,
        url: link.url || "",
        enabled: link.enabled ?? true,
      },
    ];
  });
  const emailLink = links.find((link) => link.platform === "email");
  const phoneLink = links.find((link) => link.platform === "phone");
  const whatsappLink = links.find((link) => link.platform === "whatsapp");

  return {
    profile: {
      avatarUrl: profile.avatar_url || "",
      name: profile.display_name || "",
      subtitle: "",
      bio: profile.bio || "",
      heroUrl: profile.banner_url || "",
      footerEnabled: profile.footer_enabled ?? false,
      footerText: profile.footer_text || "",
      ringEnabled: profile.ring_enabled ?? false,
      ringColor: profile.ring_color || "#000000",
      ringThickness: profile.ring_thickness || "thin",
      avatarShape: profile.avatar_shape || "circle",
      titleColor: profile.title_color || undefined,
      bioColor: profile.bio_color || undefined,
      titleFontFamily: resolveSupportedFont(profile.title_font_family),
      bioFontFamily: resolveSupportedFont(profile.bio_font_family),
      titleSize: profile.title_size,
      titleWeight: profile.title_weight,
      titleAlign: profile.title_align,
      bioSize: profile.bio_size,
      bioWeight: profile.bio_weight,
      bioAlign: profile.bio_align,
    },
    links: normalizedLinks,
    cards: links.map((link, index) => ({
      id: link.id || `profile-card-${index}`,
      imageUrl: link.social_cover_image_url || "",
      title: link.label || "Enlace",
      description: link.subtitle || "",
      ctaLabel: link.label || "Abrir enlace",
      ctaUrl: link.url || "",
      enabled: link.enabled ?? true,
    })),
    socials: socialLinks,
    contact: {
      email: contactValue(emailLink, "mailto:"),
      phone: contactValue(phoneLink, "tel:"),
      whatsapp: contactValue(whatsappLink, "https://wa.me/"),
    },
  };
}

function resolveButtonStyle(
  template: TemplateDefinition,
  override: ButtonCustomizationOverrides | undefined,
): ButtonStyleConfig {
  const fallback = requiredOption(template.customization.buttonStyles[0], "button style");
  if (!override) return fallback;

  const desiredShape =
    override.button_style === "soft"
      ? "premium-soft"
      : override.button_style === "solid" && override.button_radius === "none"
        ? "sharp"
        : override.button_style === "solid" && override.button_radius === "rounded"
          ? "rounded"
          : override.button_style === "solid" && override.button_radius === "full"
            ? "pill"
            : null;

  if (!desiredShape) return fallback;

  return (
    template.customization.buttonStyles.find(
      (style) =>
        style.shape === desiredShape &&
        (desiredShape !== "premium-soft" || style.variant === "soft"),
    ) ?? fallback
  );
}

function resolveButtonCustomization(
  palette: PaletteConfig,
  style: ButtonStyleConfig,
  override: ButtonCustomizationOverrides | undefined,
): ButtonCustomizationConfig {
  const borderWidth =
    override?.button_border_thickness === "thin"
      ? 1
      : override?.button_border_thickness === "medium"
        ? 2
        : override?.button_border_thickness === "strong"
          ? 3
          : override?.button_border_thickness === "none"
            ? 0
            : style.variant === "outline"
              ? 1
              : 0;
  const spacing =
    override?.theme_spacing === "compact" ||
    override?.theme_spacing === "generous" ||
    override?.theme_spacing === "standard"
      ? SPACING_BY_THEME[override.theme_spacing]
      : SPACING_BY_THEME.standard;

  const textSize =
    override?.button_text_size === "sm"
      ? "0.875rem"
      : override?.button_text_size === "lg"
        ? "1.125rem"
        : "1rem";
  const textWeight =
    override?.button_text_weight === "normal"
      ? 400
      : override?.button_text_weight === "bold"
        ? 700
        : 600;
  const contentAlign = ["left", "center", "right"].includes(override?.button_content_align || "")
    ? (override?.button_content_align as "left" | "center" | "right")
    : "left";
  const iconPosition =
    override?.button_icon_position === "right" || override?.button_icon_position === "left"
      ? override.button_icon_position
      : "left";

  return {
    borderWidth,
    borderColor: isHexColor(override?.button_border_color)
      ? override.button_border_color
      : resolveDefaultButtonBorderColor(palette, style, borderWidth),
    spacing,
    textSize,
    textWeight,
    contentAlign,
    iconPosition,
  };
}

/** Assemble a runtime config, defaulting customization to the template's first option. */
export function buildConfig(
  template: TemplateDefinition,
  content: BasicTemplateContent,
  options: BuildConfigOptions = {},
): BasicTemplateConfig {
  const profileCustomization: TemplateCustomizationOverrides | undefined =
    options.profileCustomization ?? options.buttonCustomization;
  const palette = options.palette ?? resolvePalette(template, profileCustomization);
  const fontPair = options.fontPair ?? resolveFontPair(template, profileCustomization);
  const buttonStyle = options.buttonStyle ?? resolveButtonStyle(template, profileCustomization);
  const buttonCustomization = resolveButtonCustomization(
    palette,
    buttonStyle,
    profileCustomization,
  );
  return {
    template,
    content,
    palette,
    fontPair,
    buttonStyle,
    buttonCustomization,
    heroFusionStrength: resolveFusionStrength(profileCustomization?.banner_fusion_strength),
  };
}
