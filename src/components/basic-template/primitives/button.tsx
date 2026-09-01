import type { CSSProperties } from "react";
import type {
  ButtonCustomizationConfig,
  ButtonStyleConfig,
  LinkItem,
  PaletteConfig,
} from "@/types/basic-templates";

function shapeRadius(shape: ButtonStyleConfig["shape"]): string {
  if (shape === "pill") return "9999px";
  if (shape === "sharp") return "2px";
  if (shape === "premium-soft") return "20px";
  return "12px";
}

function isGradient(value: string): boolean {
  return /^(linear-gradient|radial-gradient)\(/.test(value.trim());
}

/** Resolve a ButtonStyleConfig + palette into inline CSS for an anchor/button. */
export function buttonStyles(
  palette: PaletteConfig,
  style: ButtonStyleConfig,
  customization: ButtonCustomizationConfig,
): CSSProperties {
  const borderRadius = shapeRadius(style.shape);
  const border =
    customization.borderWidth > 0
      ? `${customization.borderWidth}px solid ${customization.borderColor}`
      : "none";
  if (style.variant === "outline") {
    return {
      backgroundColor: "transparent",
      color: palette.accent,
      border,
      borderRadius,
    };
  }
  if (style.variant === "soft") {
    return {
      background: isGradient(palette.accent) ? palette.accent : `${palette.accent}1f`,
      color: isGradient(palette.accent) ? palette.accentText : palette.accent,
      border,
      borderRadius,
    };
  }
  return {
    background: palette.accent,
    color: palette.accentText,
    border,
    borderRadius,
  };
}

interface LinkButtonProps {
  link: LinkItem;
  palette: PaletteConfig;
  style: ButtonStyleConfig;
  customization: ButtonCustomizationConfig;
  bodyFont: string;
}

/** Label typography/alignment resolved from the shared button customization contract. */
export function buttonLabelStyle(customization: ButtonCustomizationConfig): CSSProperties {
  const align = customization.contentAlign ?? "left";
  return {
    flexDirection: customization.iconPosition === "right" ? "row-reverse" : "row",
    ...(customization.textSize ? { fontSize: customization.textSize } : {}),
    ...(customization.textWeight ? { fontWeight: customization.textWeight } : {}),
    justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
    textAlign: align,
  };
}

export function LinkButton({ link, palette, style, customization, bodyFont }: LinkButtonProps) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 w-full items-center px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
      style={{
        ...buttonStyles(palette, style, customization),
        ...buttonLabelStyle(customization),
        fontFamily: bodyFont,
      }}
    >
      <span className="min-w-0 break-words">{link.label}</span>
    </a>
  );
}
