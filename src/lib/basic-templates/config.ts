import type {
  ButtonCustomizationConfig,
  BasicTemplateConfig,
  BasicTemplateContent,
  CardPresentation,
  CardMediaMode,
  CardMediaPosition,
  CardCornerStyle,
  CardCtaLabel,
  LinkPresentation,
  ButtonStyleConfig,
  FontPairConfig,
  PaletteConfig,
  TemplateDefinition,
} from "@/types/basic-templates";
import { BASIC_CARD_CTA_PRESETS } from "@/types/basic-templates";
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
  "email",
]);

const BASIC_LINK_PRESENTATIONS_KEY = "basic_link_presentations";
export const BASIC_PROFESSIONAL_BADGE_KEY = "professional_badge";
export const BASIC_CARD_TITLE_MAX_LENGTH = 40;
export const BASIC_CARD_DESCRIPTION_MAX_LENGTH = 120;

interface StoredBasicLinkPresentation {
  presentation?: LinkPresentation;
  card?: Partial<CardPresentation>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function getStoredBasicLinkPresentation(profile: Partial<Profile>, linkId: string) {
  const templateConfig = profile.template_config;
  if (!isRecord(templateConfig)) return undefined;
  const presentations = templateConfig[BASIC_LINK_PRESENTATIONS_KEY];
  if (!isRecord(presentations)) return undefined;
  const stored = presentations[linkId];
  return isRecord(stored) ? (stored as StoredBasicLinkPresentation) : undefined;
}

function isCardMediaMode(value: unknown): value is CardMediaMode {
  return value === "image" || value === "platform_icon" || value === "none";
}

function isCardMediaPosition(value: unknown): value is CardMediaPosition {
  return value === "right" || value === "bottom";
}

function isCardCornerStyle(value: unknown): value is CardCornerStyle {
  return value === "square" || value === "soft";
}

function isCardCtaLabel(value: unknown): value is CardCtaLabel {
  return BASIC_CARD_CTA_PRESETS.some((preset) => preset === value);
}

function normalizeCardText(value: unknown, fallback: string, maxLength: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback.trim()).slice(0, maxLength);
}

function normalizeCardDescription(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, BASIC_CARD_DESCRIPTION_MAX_LENGTH) : "";
}

function normalizeCardFocalY(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

export function isBasicProfessionalBadgeEnabled(profile: Partial<Profile>): boolean {
  const templateConfig = profile.template_config;
  return isRecord(templateConfig) && templateConfig[BASIC_PROFESSIONAL_BADGE_KEY] === true;
}

export function updateBasicProfessionalBadge(
  profile: Partial<Profile>,
  enabled: boolean,
): Partial<Profile> {
  const currentConfig = isRecord(profile.template_config) ? profile.template_config : {};
  return {
    template_config: {
      ...currentConfig,
      [BASIC_PROFESSIONAL_BADGE_KEY]: enabled,
    },
  };
}

/** Normalize compatibility aliases before Basic UI, storage projections and rendering. */
export function normalizeBasicPlatform(value: unknown): string {
  if (typeof value !== "string") return "";
  const platform = value.trim().toLowerCase();
  return platform === "x" ? "twitter" : platform;
}

/** `card` is a legacy button style, never the Basic professional-card mode. */
export function normalizeBasicButtonStyle(value: Profile["button_style"] | null | undefined) {
  return value === "card" || !value ? "solid" : value;
}

/** Resolve persisted Basic presentation metadata without changing link identity. */
export function getBasicLinkPresentation(
  profile: Partial<Profile>,
  link: Partial<ProfileLink>,
): { presentation: LinkPresentation; card: CardPresentation } {
  const linkId = link.id || "";
  const stored = linkId ? getStoredBasicLinkPresentation(profile, linkId) : undefined;
  const storedCard = isRecord(stored?.card) ? stored.card : {};
  const fallbackMediaMode: CardMediaMode = link.social_cover_image_url ? "image" : "platform_icon";
  const imageUrl =
    hasOwn(storedCard, "imageUrl") && typeof storedCard.imageUrl === "string"
      ? storedCard.imageUrl.trim()
      : link.social_cover_image_url?.trim() || "";

  return {
    presentation: stored?.presentation === "card" ? "card" : "button",
    card: {
      title: normalizeCardText(storedCard.title, link.label || "Enlace", BASIC_CARD_TITLE_MAX_LENGTH),
      description: hasOwn(storedCard, "description")
        ? normalizeCardDescription(storedCard.description)
        : normalizeCardDescription(link.subtitle || ""),
      ctaLabel: isCardCtaLabel(storedCard.ctaLabel)
        ? storedCard.ctaLabel
        : BASIC_CARD_CTA_PRESETS[0],
      mediaMode: isCardMediaMode(storedCard.mediaMode)
        ? storedCard.mediaMode
        : fallbackMediaMode,
      mediaPosition: isCardMediaPosition(storedCard.mediaPosition)
        ? storedCard.mediaPosition
        : "right",
      focalY: normalizeCardFocalY(storedCard.focalY),
      imageUrl,
      cornerStyle: isCardCornerStyle(storedCard.cornerStyle)
        ? storedCard.cornerStyle
        : "soft",
    },
  };
}

/** Update only the namespaced Basic presentation JSON already stored on profiles. */
export function updateBasicLinkPresentation(
  profile: Partial<Profile>,
  linkId: string,
  updates: StoredBasicLinkPresentation,
): Partial<Profile> {
  const currentConfig = isRecord(profile.template_config) ? profile.template_config : {};
  const currentPresentations = isRecord(currentConfig[BASIC_LINK_PRESENTATIONS_KEY])
    ? currentConfig[BASIC_LINK_PRESENTATIONS_KEY]
    : {};
  const current = isRecord(currentPresentations[linkId])
    ? (currentPresentations[linkId] as StoredBasicLinkPresentation)
    : {};

  return {
    template_config: {
      ...currentConfig,
      [BASIC_LINK_PRESENTATIONS_KEY]: {
        ...currentPresentations,
        [linkId]: {
          ...current,
          ...updates,
          ...(updates.card
            ? { card: { ...(current.card || {}), ...updates.card } }
            : {}),
        },
      },
    },
  };
}

/** Remap unsaved temporary link keys after the database assigns real link IDs. */
export function remapBasicLinkPresentationIds(
  templateConfig: unknown,
  idMap: Record<string, string>,
): unknown {
  if (!isRecord(templateConfig)) return templateConfig;
  const presentations = templateConfig[BASIC_LINK_PRESENTATIONS_KEY];
  if (!isRecord(presentations)) return templateConfig;

  const remapped = { ...presentations };
  for (const [temporaryId, persistedId] of Object.entries(idMap)) {
    if (temporaryId in remapped) {
      remapped[persistedId] = remapped[temporaryId];
      delete remapped[temporaryId];
    }
  }

  return { ...templateConfig, [BASIC_LINK_PRESENTATIONS_KEY]: remapped };
}

/** Return the existing platform IDs used by PlatformPicker/icon mapping. */
export function detectBasicPlatformFromUrl(value: string): SocialPlatform | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
    if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "youtube";
    if (host === "wa.me" || host === "whatsapp.com" || host.endsWith(".whatsapp.com")) return "whatsapp";
    if (host === "facebook.com" || host.endsWith(".facebook.com")) return "facebook";
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
    if (host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) return "twitter";
  } catch {
    return null;
  }

  return null;
}

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
  "IBM Plex Sans",
  "Nunito Sans",
  "Space Grotesk",
  "Outfit",
  "Urbanist",
  "Josefin Sans",
  "Plus Jakarta Sans",
  "Rubik",
  "Quicksand",
  "Comfortaa",
  "Cabin",
  "Lora",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Bitter",
  "Fraunces",
  "Bebas Neue",
  "Oswald",
  "Archivo Black",
  "Anton",
  "Abril Fatface",
  "Righteous",
  "Caveat",
  "Dancing Script",
  "Pacifico",
  "Lobster",
  "Permanent Marker",
  "Amatic SC",
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

/** Pick the most readable light/dark foreground for a solid action color. */
export function resolveReadableTextColor(background: string, fallback: string): string {
  if (!isHexColor(background)) return fallback;
  if (isHexColor(fallback) && contrastRatio(background, fallback) >= 3) return fallback;
  const lightRatio = contrastRatio(background, "#ffffff");
  const darkRatio = contrastRatio(background, "#111111");
  return lightRatio >= darkRatio ? "#ffffff" : "#111111";
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
  const normalizedLinks = links.map((link, index) => {
    const linkId = link.id || `profile-link-${index}`;
    const presentation = getBasicLinkPresentation(profile, { ...link, id: linkId });
    const platform = normalizeBasicPlatform(link.platform);
    return {
      id: linkId,
      label: link.label || "Enlace",
      url: link.url || "",
      enabled: link.enabled ?? true,
      ...(platform ? { platform } : {}),
      presentation: presentation.presentation,
      card: presentation.card,
    };
  });
  const socialLinks = links.flatMap((link, index) => {
    const platform = normalizeBasicPlatform(link.platform);
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
      subtitle: profile.profession?.trim() || "",
      bio: profile.bio || "",
      heroUrl: profile.banner_url || "",
      footerEnabled: profile.footer_enabled ?? false,
      footerText: profile.footer_text || "",
      professionalBadge: isBasicProfessionalBadgeEnabled(profile),
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
    cards: normalizedLinks
      .filter((link) => link.presentation === "card")
      .map((link) => ({
        id: link.id,
        imageUrl: link.card?.imageUrl || "",
        title: link.card?.title || link.label,
        description: link.card?.description || "",
        ctaLabel: link.card?.ctaLabel || BASIC_CARD_CTA_PRESETS[0],
        ctaUrl: link.url,
        enabled: link.enabled,
        ...(link.platform ? { platform: link.platform } : {}),
        mediaMode: link.card?.mediaMode,
        mediaPosition: link.card?.mediaPosition,
        focalY: link.card?.focalY,
        cornerStyle: link.card?.cornerStyle,
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
  const buttonStyle = normalizeBasicButtonStyle(override.button_style);

  const desiredShape =
    buttonStyle === "outline"
      ? "sharp"
      : buttonStyle === "soft"
      ? "premium-soft"
      : buttonStyle === "solid" && override.button_radius === "none"
        ? "sharp"
        : buttonStyle === "solid" && override.button_radius === "rounded"
          ? "rounded"
          : buttonStyle === "solid" && override.button_radius === "full"
            ? "pill"
            : null;

  if (!desiredShape) return fallback;

  return (
    template.customization.buttonStyles.find(
      (style) =>
        style.shape === desiredShape &&
        (desiredShape !== "premium-soft" || style.variant === "soft") &&
        (buttonStyle !== "outline" || style.variant === "outline"),
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
