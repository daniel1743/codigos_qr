import { resolveReadableTextColor } from "../basic-templates/config";
import type {
  BasicTemplateConfig,
  ButtonStyleConfig,
  CardMediaMode,
} from "@/types/basic-templates";
import type {
  BasicEditorAdapterMediaDiagnosticV1,
  BasicEditorContrastCheckV1,
  BasicEditorContrastValidationV1,
  BasicEditorMediaSourceTypeV1,
} from "./types";

interface RgbaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

interface ColorSample {
  readonly color: RgbaColor;
  readonly label: string;
}

const COLOR_TOKEN = /#[0-9a-f]{3,4}(?:[0-9a-f]{2})?|rgba?\([^)]*\)/gi;

function parseAlpha(value: string): number | null {
  const parsed = value.trim().endsWith("%")
    ? Number.parseFloat(value) / 100
    : Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : null;
}

function parseColor(value: string): RgbaColor | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (![3, 4, 6, 8].includes(hex.length) || !/^[0-9a-f]+$/i.test(hex)) return null;
    const expanded =
      hex.length <= 4
        ? hex
            .split("")
            .map((channel) => channel + channel)
            .join("")
        : hex;
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
      a: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    };
  }
  const match = trimmed.match(/^rgba?\(\s*([^)]*)\)$/i);
  if (!match) return null;
  const channels = match[1]!.split(/\s*[,/]\s*/);
  if (channels.length < 3) return null;
  const rgb = channels.slice(0, 3).map((channel) => Number.parseFloat(channel));
  if (rgb.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) return null;
  const alpha = channels.length > 3 ? parseAlpha(channels[3]!) : 1;
  if (alpha === null) return null;
  return { r: rgb[0]!, g: rgb[1]!, b: rgb[2]!, a: alpha };
}

function colorToCss(color: RgbaColor): string {
  const channels = [color.r, color.g, color.b].map((channel) =>
    Math.round(channel).toString(16).padStart(2, "0"),
  );
  const hex = `#${channels.join("")}`;
  return color.a >= 0.999
    ? hex
    : `${hex}${Math.round(color.a * 255)
        .toString(16)
        .padStart(2, "0")}`;
}

function composite(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

function luminance(color: RgbaColor): number {
  const linear = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}

function contrastRatio(foreground: RgbaColor, background: RgbaColor): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function gradientSamples(value: string, label: string): ColorSample[] | null {
  if (!/^(linear-gradient|radial-gradient)\(/i.test(value.trim())) return null;
  const colors = [...value.matchAll(COLOR_TOKEN)].map((match) => parseColor(match[0]!));
  if (colors.length < 2 || colors.some((color) => color === null || color.a < 0.999)) return null;
  return colors.slice(0, 2).map((color, index) => ({
    color: color!,
    label: `${label} ${index === 0 ? "from" : "to"} ${colorToCss(color!)}`,
  }));
}

function solidSamples(value: string, label: string): ColorSample[] | null {
  const gradient = gradientSamples(value, label);
  if (gradient) return gradient;
  const color = parseColor(value);
  if (!color || color.a < 0.999) return null;
  return [{ color, label: `${label} ${colorToCss(color)}` }];
}

function alphaSurfaceSamples(
  accent: string,
  alphaHex: string,
  underlying: readonly ColorSample[] | null,
  label: string,
): readonly ColorSample[] | null {
  const accentColor = parseColor(accent);
  if (!accentColor || accentColor.a < 0.999 || !underlying) return null;
  const alpha = parseColor(`${colorToCss(accentColor)}${alphaHex}`);
  if (!alpha) return null;
  return underlying.map(({ color, label: baseLabel }) => ({
    color: composite(alpha, color),
    label: `${label} ${colorToCss(alpha)} over ${baseLabel}`,
  }));
}

function actualButtonText(
  palette: BasicTemplateConfig["palette"],
  style: ButtonStyleConfig,
): string {
  if (style.variant === "outline") return resolveReadableTextColor(palette.surface, palette.accent);
  if (style.variant === "soft") {
    return /^#|^rgba?\(/i.test(palette.accent)
      ? resolveReadableTextColor(palette.accent, palette.accent)
      : palette.accentText;
  }
  return resolveReadableTextColor(palette.accent, palette.accentText);
}

function actualButtonBackground(
  palette: BasicTemplateConfig["palette"],
  style: ButtonStyleConfig,
  underlying: readonly ColorSample[] | null,
  label: string,
): readonly ColorSample[] | null {
  if (style.variant === "solid") return solidSamples(palette.accent, label);
  if (style.variant === "outline") return underlying;
  if (/^(linear-gradient|radial-gradient)\(/i.test(palette.accent.trim())) {
    return solidSamples(palette.accent, label);
  }
  return alphaSurfaceSamples(palette.accent, "1f", underlying, label);
}

function traceFor(
  engineToken: string,
  adapterColor: string,
  mapping: string,
  foreground: string,
  background: string,
  alpha: string,
  gradient: string,
): readonly string[] {
  return [
    `Engine recipe color/token: ${engineToken}`,
    `Adapter projected color: ${adapterColor}`,
    `Template capability/style mapping: ${mapping}`,
    `Effective foreground: ${foreground}`,
    `Effective background/surface: ${background}`,
    `Alpha/opacity treatment: ${alpha}`,
    `Gradient treatment: ${gradient}`,
  ];
}

function check(
  id: string,
  foreground: string,
  backgrounds: readonly ColorSample[] | null,
  size: "normal" | "large",
  trace: readonly string[],
): BasicEditorContrastCheckV1 {
  const foregroundColor = parseColor(foreground);
  const threshold = size === "large" ? 3 : 4.5;
  if (!foregroundColor || !backgrounds || backgrounds.length === 0) {
    return {
      id,
      foreground,
      background: "unknown",
      ratio: null,
      threshold,
      size,
      status: "NOT_VERIFIABLE",
      trace,
    };
  }
  const ratios = backgrounds.map(({ color }) =>
    contrastRatio(
      foregroundColor.a < 0.999 ? composite(foregroundColor, color) : foregroundColor,
      color,
    ),
  );
  const worst = Math.min(...ratios);
  return {
    id,
    foreground,
    background: backgrounds.map(({ label }) => label).join(" | "),
    ratio: Number(worst.toFixed(2)),
    threshold,
    size,
    status: worst >= threshold ? "PASS" : "FAIL",
    trace,
  };
}

export function validateProjectedContrast(
  config: BasicTemplateConfig,
): BasicEditorContrastValidationV1 {
  const { palette, buttonStyle } = config;
  const page = solidSamples(palette.background, "page");
  const buttonText = actualButtonText(palette, buttonStyle);
  const checks: BasicEditorContrastCheckV1[] = [];

  checks.push(
    check(
      "profile-title-vs-page",
      config.content.profile.titleColor || palette.text,
      page,
      "large",
      traceFor(
        "design.palette.text",
        config.content.profile.titleColor || palette.text,
        "Identity/Profile title color",
        config.content.profile.titleColor || palette.text,
        palette.background,
        "none",
        page?.map(({ label }) => label).join("; ") || "unavailable",
      ),
    ),
  );
  checks.push(
    check(
      "profile-muted-vs-page",
      config.content.profile.bioColor || palette.textMuted,
      page,
      "normal",
      traceFor(
        "design.palette.text_muted",
        config.content.profile.bioColor || palette.textMuted,
        "Identity/Profile muted text color",
        config.content.profile.bioColor || palette.textMuted,
        palette.background,
        "none",
        page?.map(({ label }) => label).join("; ") || "unavailable",
      ),
    ),
  );

  const cardSurface =
    buttonStyle.variant === "soft"
      ? alphaSurfaceSamples(palette.accent, "1f", page, "card soft surface")
      : buttonStyle.variant === "outline"
        ? solidSamples(palette.surface, "card surface")
        : solidSamples(palette.accent, "card solid surface");
  if (config.content.cards.length > 0) {
    const cardText = buttonStyle.variant === "outline" ? palette.text : buttonText;
    const cardMuted = buttonStyle.variant === "outline" ? palette.textMuted : buttonText;
    checks.push(
      check(
        "card-title-vs-surface",
        cardText,
        cardSurface,
        "normal",
        traceFor(
          "design.palette.text / design.palette.accent_contrast",
          cardText,
          "Card primitive: cardColor for title",
          cardText,
          cardSurface?.map(({ label }) => label).join(" | ") || "unknown",
          buttonStyle.variant === "soft" ? "accent 0x1f composited over page" : "none",
          cardSurface?.map(({ label }) => label).join("; ") || "unavailable",
        ),
      ),
    );
    checks.push(
      check(
        "card-description-vs-surface",
        cardMuted,
        cardSurface,
        "normal",
        traceFor(
          "design.palette.text_muted for outline; cardColor otherwise",
          cardMuted,
          "Card primitive: description color branch",
          cardMuted,
          cardSurface?.map(({ label }) => label).join(" | ") || "unknown",
          buttonStyle.variant === "soft" ? "accent 0x1f composited over page" : "none",
          cardSurface?.map(({ label }) => label).join("; ") || "unavailable",
        ),
      ),
    );
    const cardCtaBackground = actualButtonBackground(
      palette,
      buttonStyle,
      cardSurface,
      "card CTA surface",
    );
    checks.push(
      check(
        "card-cta-text-vs-surface",
        buttonText,
        cardCtaBackground,
        "normal",
        traceFor(
          "design.button.style + design.palette.accent_contrast",
          buttonText,
          "Card primitive: buttonStyles CTA/chip",
          buttonText,
          cardCtaBackground?.map(({ label }) => label).join(" | ") || "unknown",
          buttonStyle.variant === "soft" ? "accent 0x1f composited over card surface" : "none",
          cardCtaBackground?.map(({ label }) => label).join("; ") || "unavailable",
        ),
      ),
    );
  }

  const hasPrimaryButton = config.content.links.some((link) => link.presentation === "button");
  if (hasPrimaryButton) {
    const primaryButtonBackground = actualButtonBackground(
      palette,
      buttonStyle,
      page,
      "primary button",
    );
    checks.push(
      check(
        "primary-button-text-vs-background",
        buttonText,
        primaryButtonBackground,
        "normal",
        traceFor(
          "design.button.style + design.palette.accent_contrast",
          buttonText,
          "Button primitive: buttonStyles",
          buttonText,
          primaryButtonBackground?.map(({ label }) => label).join(" | ") || "unknown",
          buttonStyle.variant === "soft" ? "accent 0x1f composited over page" : "none",
          primaryButtonBackground?.map(({ label }) => label).join("; ") || "unavailable",
        ),
      ),
    );
  }

  const status = checks.some(({ status: value }) => value === "FAIL")
    ? "FAIL"
    : checks.some(({ status: value }) => value === "NOT_VERIFIABLE")
      ? "NOT_VERIFIABLE"
      : "PASS";
  return { status, checks, rejectedForContrast: status === "FAIL" };
}

function normalizedPlatform(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const platform = value.trim().toLowerCase();
  return platform === "x" ? "twitter" : platform;
}

const MEANINGFUL_ICON_PLATFORMS = new Set([
  "instagram",
  "twitter",
  "facebook",
  "linkedin",
  "youtube",
  "tiktok",
  "whatsapp",
  "email",
]);

export function mediaDiagnosticForCard(card: {
  id: string;
  platform?: string;
  imageUrl: string;
  mediaMode?: CardMediaMode;
  mediaPosition?: "right" | "bottom";
}): BasicEditorAdapterMediaDiagnosticV1 {
  const platform = normalizedPlatform(card.platform);
  const hasImage = Boolean(card.imageUrl.trim());
  const effectiveMediaMode = card.mediaMode ?? (hasImage ? "image" : "none");
  const genericPlatformFallback = !hasImage && (!platform || platform === "website");
  const sourceType: BasicEditorMediaSourceTypeV1 = hasImage
    ? "real_image"
    : genericPlatformFallback
      ? "generic_fallback"
      : effectiveMediaMode === "platform_icon" &&
          platform &&
          MEANINGFUL_ICON_PLATFORMS.has(platform)
        ? "platform_icon"
        : effectiveMediaMode === "platform_icon"
          ? "generic_fallback"
          : "none";
  return {
    id: card.id,
    platform,
    sourceType,
    effectiveMediaMode: sourceType === "generic_fallback" ? "none" : effectiveMediaMode,
    mediaPosition: card.mediaPosition ?? "none",
    reason:
      sourceType === "generic_fallback"
        ? "generic platform fallback suppressed; keep card compact"
        : sourceType === "real_image"
          ? "declared fixture image preserved"
          : sourceType === "platform_icon"
            ? "recognized platform icon allowed"
            : "no media declared",
  };
}

export function mediaDiagnosticsForConfig(
  config: BasicTemplateConfig,
): BasicEditorAdapterMediaDiagnosticV1[] {
  return config.content.cards.map((card) => mediaDiagnosticForCard(card));
}
