import type { CSSProperties } from "react";
import type {
  ButtonStyleConfig,
  LinkItem,
  PaletteConfig,
} from "@/types/basic-templates";

function shapeRadius(shape: ButtonStyleConfig["shape"]): string {
  if (shape === "pill") return "9999px";
  if (shape === "sharp") return "2px";
  return "12px";
}

/** Resolve a ButtonStyleConfig + palette into inline CSS for an anchor/button. */
export function buttonStyles(
  palette: PaletteConfig,
  style: ButtonStyleConfig,
): CSSProperties {
  const borderRadius = shapeRadius(style.shape);
  if (style.variant === "outline") {
    return {
      backgroundColor: "transparent",
      color: palette.accent,
      border: `1.5px solid ${palette.accent}`,
      borderRadius,
    };
  }
  if (style.variant === "soft") {
    return {
      backgroundColor: `${palette.accent}1f`,
      color: palette.accent,
      border: "1px solid transparent",
      borderRadius,
    };
  }
  return {
    backgroundColor: palette.accent,
    color: palette.accentText,
    border: "1px solid transparent",
    borderRadius,
  };
}

interface LinkButtonProps {
  link: LinkItem;
  palette: PaletteConfig;
  style: ButtonStyleConfig;
  bodyFont: string;
}

export function LinkButton({ link, palette, style, bodyFont }: LinkButtonProps) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 w-full items-center justify-center px-5 py-3 text-center text-sm font-semibold transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
      style={{ ...buttonStyles(palette, style), fontFamily: bodyFont }}
    >
      <span className="min-w-0 break-words">{link.label}</span>
    </a>
  );
}
