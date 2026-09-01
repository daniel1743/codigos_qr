import type { CSSProperties } from "react";
import type { BasicTemplateConfig, ButtonStyleConfig } from "@/types/basic-templates";

export interface StandaloneStyle {
  background?: string;
  accent?: string;
  accentText?: string;
  globalFont?: string;
  title: {
    fontFamily?: string;
    color?: string;
    size?: string;
    weight?: number;
    align?: "left" | "center" | "right";
  };
  bio: {
    fontFamily?: string;
    color?: string;
    size?: string;
    weight?: number;
    align?: "left" | "center" | "right";
  };
  button: {
    background?: string;
    textColor?: string;
    radius?: string;
    borderWidth?: string;
    borderColor?: string;
    spacing?: string;
    textSize?: string;
    textWeight?: number;
    contentAlign?: "left" | "center" | "right";
    iconPosition?: "left" | "right";
  };
  avatarRing: {
    enabled: boolean;
    color?: string;
    thickness?: string;
  };
  avatar: {
    shape: string;
    radius: string;
    display?: "none";
  };
  vars: CSSProperties & Record<string, string | number | undefined>;
}

const GENERIC_BACKGROUND = "#ffffff";
const GENERIC_BUTTON = "#111111";
const GENERIC_BUTTON_TEXT = "#ffffff";
const GENERIC_FONT = "Inter, system-ui, sans-serif";

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase();
}

function differsFromGeneric(value: string | undefined, generic: string) {
  return Boolean(value && normalize(value) !== normalize(generic));
}

function differsFromFallback(value: string | undefined, fallback: string | undefined) {
  return Boolean(value && normalize(value) !== normalize(fallback));
}

function isAlign(value: string | undefined): value is "left" | "center" | "right" {
  return value === "left" || value === "center" || value === "right";
}

function titleSize(value: string | undefined) {
  if (value === "sm") return "1.25rem";
  if (value === "md") return "1.375rem";
  if (value === "lg") return "1.5rem";
  if (value === "xl") return "1.875rem";
  return undefined;
}

function bioSize(value: string | undefined) {
  if (value === "sm") return "0.75rem";
  if (value === "md") return "0.875rem";
  if (value === "lg") return "1rem";
  return undefined;
}

function fontWeight(value: string | undefined) {
  if (value === "light") return 300;
  if (value === "normal") return 400;
  if (value === "semibold") return 600;
  if (value === "bold") return 700;
  return undefined;
}

function buttonRadius(shape: ButtonStyleConfig["shape"]) {
  if (shape === "pill") return "9999px";
  if (shape === "sharp") return "2px";
  if (shape === "premium-soft") return "20px";
  return "12px";
}

function editorButtonBackground(config: BasicTemplateConfig) {
  if (config.buttonStyle.variant === "outline") return "transparent";
  if (config.buttonStyle.variant === "soft" && !config.palette.accent.includes("gradient")) {
    return `${config.palette.accent}1f`;
  }
  return config.palette.accent;
}

function editorButtonTextColor(config: BasicTemplateConfig) {
  if (config.buttonStyle.variant === "outline") return config.palette.accent;
  if (config.buttonStyle.variant === "soft" && !config.palette.accent.includes("gradient")) {
    return config.palette.accent;
  }
  return config.palette.accentText;
}

function buttonJustify(align: "left" | "center" | "right" | undefined) {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
}

function avatarRadius(shape: string | undefined) {
  if (shape === "rounded" || shape === "square") return "18px";
  if (shape === "none") return "0";
  return "9999px";
}

export function buildStandaloneStyle(config: BasicTemplateConfig): StandaloneStyle {
  const fallbackPalette = config.template.customization.palettes[0];
  const fallbackFontPair = config.template.customization.fontPairs[0];
  const fallbackButtonStyle = config.template.customization.buttonStyles[0];
  const { profile } = config.content;
  const background =
    differsFromGeneric(config.palette.background, GENERIC_BACKGROUND) &&
    differsFromFallback(config.palette.background, fallbackPalette?.background)
      ? config.palette.background
      : undefined;
  const accent =
    differsFromGeneric(config.palette.accent, GENERIC_BUTTON) &&
    differsFromFallback(config.palette.accent, fallbackPalette?.accent)
      ? config.palette.accent
      : undefined;
  const accentText =
    differsFromGeneric(config.palette.accentText, GENERIC_BUTTON_TEXT) &&
    differsFromFallback(config.palette.accentText, fallbackPalette?.accentText)
      ? config.palette.accentText
      : undefined;
  const globalFont =
    differsFromGeneric(config.fontPair.body, GENERIC_FONT) &&
    differsFromFallback(config.fontPair.body, fallbackFontPair?.body)
      ? config.fontPair.body
      : undefined;
  const buttonShapeChanged = Boolean(
    fallbackButtonStyle && config.buttonStyle.shape !== fallbackButtonStyle.shape,
  );
  const buttonVariantChanged = Boolean(
    fallbackButtonStyle && config.buttonStyle.variant !== fallbackButtonStyle.variant,
  );
  const borderWidth =
    buttonShapeChanged || buttonVariantChanged || config.buttonCustomization.borderWidth > 0
      ? `${config.buttonCustomization.borderWidth}px`
      : undefined;
  const button = {
    background: accent ? editorButtonBackground(config) : undefined,
    textColor: accent || accentText ? editorButtonTextColor(config) : undefined,
    radius: buttonShapeChanged ? buttonRadius(config.buttonStyle.shape) : undefined,
    borderWidth,
    borderColor: borderWidth ? config.buttonCustomization.borderColor : undefined,
    spacing:
      config.buttonCustomization.spacing !== "0.75rem"
        ? config.buttonCustomization.spacing
        : undefined,
    textSize: config.buttonCustomization.textSize,
    textWeight: config.buttonCustomization.textWeight,
    contentAlign: config.buttonCustomization.contentAlign,
    iconPosition: config.buttonCustomization.iconPosition,
  };
  const title = {
    fontFamily: profile.titleFontFamily || globalFont,
    color: profile.titleColor,
    size: titleSize(profile.titleSize),
    weight: fontWeight(profile.titleWeight),
    align: isAlign(profile.titleAlign) ? profile.titleAlign : undefined,
  };
  const bio = {
    fontFamily: profile.bioFontFamily || globalFont,
    color: profile.bioColor,
    size: bioSize(profile.bioSize),
    weight: fontWeight(profile.bioWeight),
    align: isAlign(profile.bioAlign) ? profile.bioAlign : undefined,
  };
  const avatarRing = {
    enabled: profile.ringEnabled ?? false,
    color: profile.ringColor,
    thickness: profile.ringThickness,
  };
  const avatar = {
    shape: profile.avatarShape || "circle",
    radius: avatarRadius(profile.avatarShape),
    display: profile.avatarShape === "none" ? ("none" as const) : undefined,
  };

  return {
    background,
    accent,
    accentText,
    globalFont,
    title,
    bio,
    button,
    avatarRing,
    avatar,
    vars: {
      "--standalone-bg": background,
      "--standalone-accent": accent,
      "--standalone-accent-text": accentText,
      "--standalone-font": globalFont,
      "--standalone-title-font": title.fontFamily,
      "--standalone-title-color": title.color,
      "--standalone-title-size": title.size,
      "--standalone-title-weight": title.weight,
      "--standalone-title-align": title.align,
      "--standalone-bio-font": bio.fontFamily,
      "--standalone-bio-color": bio.color,
      "--standalone-bio-size": bio.size,
      "--standalone-bio-weight": bio.weight,
      "--standalone-bio-align": bio.align,
      "--standalone-button-bg": button.background,
      "--standalone-button-text": button.textColor,
      "--standalone-button-radius": button.radius,
      "--standalone-button-border-width": button.borderWidth,
      "--standalone-button-border-color": button.borderColor,
      "--standalone-button-gap": button.spacing,
      "--standalone-button-font-size": button.textSize,
      "--standalone-button-font-weight": button.textWeight,
      "--standalone-button-text-align": button.contentAlign,
      "--standalone-button-justify": buttonJustify(button.contentAlign),
      "--standalone-button-flex-direction":
        button.iconPosition === "right" ? "row-reverse" : "row",
      "--standalone-avatar-radius": avatar.radius,
      "--standalone-avatar-display": avatar.display,
      "--standalone-avatar-ring-color": avatarRing.enabled ? avatarRing.color : undefined,
      "--standalone-avatar-ring-width":
        avatarRing.enabled && avatarRing.thickness === "thin"
          ? "2px"
          : avatarRing.enabled && avatarRing.thickness === "thick"
            ? "5px"
            : avatarRing.enabled
              ? "3px"
              : undefined,
    },
  };
}
