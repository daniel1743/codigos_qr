import type { CSSProperties } from "react";
import type {
  BlockStyle,
  DecorativeFramePreset,
  TemplateTheme,
  ThemeTexture,
} from "../types";
import { hexToRgba, readableOn } from "../utils";

/**
 * STYLE ENGINE
 * Converts theme tokens into CSS custom properties and reusable inline styles.
 * All visual values live here — never scattered across block components.
 */

export function themeToCssVars(theme: TemplateTheme): CSSProperties {
  const c = theme.colors;

  // Base CSS variables
  const vars: Record<string, string> = {
    ["--pts-primary" as string]: c.primary,
    ["--pts-secondary" as string]: c.secondary,
    ["--pts-accent" as string]: c.accent,
    ["--pts-bg" as string]: c.background,
    ["--pts-surface" as string]: c.surface,
    ["--pts-surface-alt" as string]: c.surfaceAlt ?? hexToRgba(c.surface, 0.8),
    ["--pts-card" as string]: c.card,
    ["--pts-text" as string]: c.text,
    ["--pts-muted" as string]: c.mutedText,
    ["--pts-border" as string]: c.border,
    ["--pts-success" as string]: c.success ?? "#10b981",
    ["--pts-warning" as string]: c.warning ?? "#f59e0b",
    ["--pts-danger" as string]: c.danger ?? "#ef4444",
    ["--pts-radius" as string]: `${theme.cards.radius}px`,
    ["--pts-btn-radius" as string]: `${theme.buttons.radius}px`,
    ["--pts-heading-font" as string]: theme.typography.headingFont,
    ["--pts-body-font" as string]: theme.typography.bodyFont,
  };

  // Add radii presets
  if (theme.radii) {
    Object.entries(theme.radii).forEach(([k, v]) => {
      vars[`--pts-radius-${k}`] = `${v}px`;
    });
  }

  // Add shadows presets
  if (theme.shadows) {
    Object.entries(theme.shadows).forEach(([k, v]) => {
      vars[`--pts-shadow-${k}`] = v;
    });
  }

  // Add borders presets
  if (theme.borders) {
    Object.entries(theme.borders).forEach(([k, v]) => {
      vars[`--pts-border-width-${k}`] = `${v.width}px`;
    });
  }

  // Add gradients presets
  if (theme.gradients) {
    Object.entries(theme.gradients).forEach(([k, v]) => {
      vars[`--pts-gradient-${k}`] = v;
    });
  }

  // Add typography scale
  if (theme.typography.scale) {
    Object.entries(theme.typography.scale).forEach(([k, v]) => {
      vars[`--pts-font-size-${k}`] = `${v.size}px`;
      vars[`--pts-font-weight-${k}`] = String(v.weight);
      vars[`--pts-line-height-${k}`] = String(v.lineHeight);
      vars[`--pts-letter-spacing-${k}`] = `${v.letterSpacing}em`;
    });
  }

  return {
    ...vars,
    color: c.text,
    fontFamily: theme.typography.bodyFont,
    fontSize: `${theme.typography.bodySize}px`,
    lineHeight: theme.typography.lineHeight,
    letterSpacing: `${theme.typography.letterSpacing}em`,
  } as CSSProperties;
}

export function pageBackground(theme: TemplateTheme): CSSProperties {
  const bg = theme.background;
  const base: CSSProperties = { backgroundColor: bg.color ?? theme.colors.background };
  if (bg.type === "gradient" && bg.gradient && !bg.blur) {
    const { kind, angle, from, to } = bg.gradient;
    base.backgroundImage =
      kind === "radial"
        ? `radial-gradient(120% 90% at 50% 0%, ${from} 0%, ${to} 70%)`
        : `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
  }
  if (bg.type === "image" && bg.imageUrl && !bg.blur) {
    base.backgroundImage = `linear-gradient(${hexToRgba(theme.colors.background, bg.overlay ?? 0.5)}, ${hexToRgba(
      theme.colors.background,
      bg.overlay ?? 0.5,
    )}), url(${JSON.stringify(bg.imageUrl)})`;
    base.backgroundSize = "cover";
    base.backgroundPosition = "center";
    base.backgroundAttachment = "scroll";
  }
  if (bg.type === "pattern" && !bg.blur) {
    const dot = hexToRgba(theme.colors.text, 0.09);
    const patterns: Record<string, string> = {
      dots: `radial-gradient(${dot} 1px, transparent 1px)`,
      grid: `linear-gradient(${dot} 1px, transparent 1px), linear-gradient(90deg, ${dot} 1px, transparent 1px)`,
      rings: `repeating-radial-gradient(circle at 50% 0%, ${dot} 0 1px, transparent 1px 42px)`,
      noise: `radial-gradient(${dot} 1px, transparent 1px)`,
    };
    base.backgroundImage = patterns[bg.pattern ?? "dots"];
    base.backgroundSize = bg.pattern === "grid" ? "28px 28px" : "20px 20px";
  }
  return base;
}

/** Background layer used when a configured background blur must not blur page content. */
export function backgroundLayerStyle(theme: TemplateTheme): CSSProperties | undefined {
  const bg = theme.background;
  if (!bg.blur) return undefined;

  const style: CSSProperties = {
    position: "absolute",
    inset: -Math.max(12, bg.blur * 1.5),
    pointerEvents: "none",
    zIndex: 0,
    backgroundColor: bg.color ?? theme.colors.background,
    filter: `blur(${bg.blur}px)`,
    transform: "scale(1.04)",
  };

  if (bg.type === "gradient" && bg.gradient) {
    const { kind, angle, from, to } = bg.gradient;
    style.backgroundImage =
      kind === "radial"
        ? `radial-gradient(120% 90% at 50% 0%, ${from} 0%, ${to} 70%)`
        : `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
  } else if (bg.type === "image" && bg.imageUrl) {
    const overlay = bg.overlay ?? 0.5;
    style.backgroundImage = `linear-gradient(${hexToRgba(
      bg.color ?? theme.colors.background,
      overlay,
    )}, ${hexToRgba(bg.color ?? theme.colors.background, overlay)}), url(${JSON.stringify(
      bg.imageUrl,
    )})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  } else if (bg.type === "pattern") {
    const dot = hexToRgba(theme.colors.text, 0.09);
    style.backgroundImage =
      bg.pattern === "grid"
        ? `linear-gradient(${dot} 1px, transparent 1px), linear-gradient(90deg, ${dot} 1px, transparent 1px)`
        : bg.pattern === "rings"
          ? `repeating-radial-gradient(circle at 50% 0%, ${dot} 0 1px, transparent 1px 42px)`
          : `radial-gradient(${dot} 1px, transparent 1px)`;
    style.backgroundSize = bg.pattern === "grid" ? "28px 28px" : "20px 20px";
  }

  return style;
}

/** Lightweight CSS-only textures. No network assets or runtime libraries required. */
export function textureStyle(texture?: ThemeTexture): CSSProperties | undefined {
  if (!texture || texture.preset === "none" || texture.opacity <= 0) return undefined;

  const scale = Math.max(4, texture.scale ?? 24);
  const dot = "rgba(255,255,255,.16)";
  const darkDot = "rgba(0,0,0,.12)";
  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 1,
    opacity: Math.max(0, Math.min(1, texture.opacity)),
    backgroundRepeat: "repeat",
    mixBlendMode: "soft-light",
  };

  switch (texture.preset) {
    case "grain":
      style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${scale}' height='${scale}' viewBox='0 0 ${scale} ${scale}'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.38'/%3E%3C/svg%3E")`;
      style.backgroundSize = `${scale}px ${scale}px`;
      break;
    case "paper":
      style.backgroundImage = `radial-gradient(${darkDot} 0.7px, transparent 0.8px), radial-gradient(${dot} 0.6px, transparent 0.8px)`;
      style.backgroundSize = `${scale}px ${scale}px, ${Math.max(8, scale - 7)}px ${Math.max(8, scale - 7)}px`;
      break;
    case "linen":
      style.backgroundImage = `repeating-linear-gradient(0deg, transparent, transparent 2px, ${darkDot} 3px, transparent 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, ${dot} 3px, transparent 4px)`;
      style.backgroundSize = `${scale}px ${scale}px`;
      break;
    case "mesh":
      style.backgroundImage = `radial-gradient(at 20% 20%, ${dot}, transparent 45%), radial-gradient(at 80% 15%, ${darkDot}, transparent 42%), radial-gradient(at 70% 85%, ${dot}, transparent 48%)`;
      style.backgroundSize = `${scale * 4}px ${scale * 4}px`;
      break;
    case "frost":
      style.backgroundImage = `linear-gradient(135deg, rgba(255,255,255,.16), transparent 42%), radial-gradient(circle at 70% 20%, rgba(255,255,255,.18), transparent 36%)`;
      style.backgroundSize = `${scale * 3}px ${scale * 3}px`;
      style.backdropFilter = "blur(1px)";
      break;
  }

  return style;
}

export function decorativeFrameStyle(
  preset: DecorativeFramePreset | undefined,
  accent: string,
): CSSProperties {
  if (!preset || preset === "none") return {};
  const softAccent = hexToRgba(accent, 0.42);
  switch (preset) {
    case "hairline":
      return { border: `1px solid ${hexToRgba(accent, 0.28)}` };
    case "double":
      return { border: `3px double ${softAccent}` };
    case "inset":
      return { boxShadow: `inset 0 0 0 1px ${softAccent}` };
    case "gradient":
      return {
        border: "2px solid transparent",
        borderImage: `linear-gradient(120deg, ${accent}, ${hexToRgba(accent, 0.16)}, ${accent}) 1`,
      };
    case "luxury":
      return {
        border: `1px solid ${softAccent}`,
        boxShadow: `inset 0 0 0 1px ${hexToRgba(accent, 0.12)}, 0 10px 28px -22px ${accent}`,
      };
    case "glow":
      return { boxShadow: `0 0 0 1px ${softAccent}, 0 0 30px -12px ${accent}` };
    default:
      return {};
  }
}

const SHADOWS: Record<string, (accent: string) => string> = {
  none: () => "none",
  sm: () => "0 1px 2px rgba(0,0,0,0.06), 0 4px 14px -8px rgba(0,0,0,0.18)",
  md: () => "0 2px 6px rgba(0,0,0,0.08), 0 18px 36px -22px rgba(0,0,0,0.35)",
  lg: () => "0 8px 20px rgba(0,0,0,0.10), 0 32px 60px -28px rgba(0,0,0,0.45)",
  glow: (accent: string) => `0 12px 40px -18px ${hexToRgba(accent, 0.45)}`,
  // Expanded Design System Shadows
  soft: () => "0 2px 10px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
  elevated: () => "0 10px 30px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)",
  floating: () => "0 20px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.04)",
};

function hexToRgbValues(hex: string): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (clean.length === 3 ? (num >> 8) & 15 : (num >> 16) & 255) || 0;
  const g = (clean.length === 3 ? (num >> 4) & 15 : (num >> 8) & 255) || 0;
  const b = (clean.length === 3 ? num & 15 : num & 255) || 0;
  return `${r}, ${g}, ${b}`;
}

export function shadow(kind: string | undefined, accent: string, theme?: TemplateTheme): string {
  if (theme?.shadows && kind && theme.shadows[kind as keyof typeof theme.shadows]) {
    const custom = theme.shadows[kind as keyof typeof theme.shadows];
    if (custom.includes("var(--pts-accent-rgb)")) {
      return custom.replace("var(--pts-accent-rgb)", hexToRgbValues(accent));
    }
    return custom;
  }
  return (SHADOWS[kind ?? "none"] ?? SHADOWS["none"]!)(accent);
}

export function cardStyle(theme: TemplateTheme, override: BlockStyle = {}): CSSProperties {
  const cards = theme.cards;
  const radius = override.radius !== undefined ? override.radius : cards.radius;
  const preset = cards.preset;

  // Border calculation
  const borderWidth = override.borderWidth !== undefined ? override.borderWidth : cards.borderWidth;
  const borderColor = override.background ? hexToRgba(theme.colors.text, 0.1) : theme.colors.border;

  const style: CSSProperties = {
    borderRadius: radius,
    padding: override.padding !== undefined ? override.padding : cards.padding,
    borderStyle: borderWidth > 0 ? "solid" : "none",
    borderWidth: borderWidth,
    borderColor: borderColor,
    backgroundColor: override.background ?? hexToRgba(theme.colors.card, cards.opacity),
    boxShadow: shadow(override.shadow ?? cards.shadow, theme.colors.accent, theme),
    color: override.textColor ?? theme.colors.text,
    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
  };

  if (preset === "glass") {
    style.backdropFilter = `blur(${cards.blur || 14}px)`;
    style.WebkitBackdropFilter = `blur(${cards.blur || 14}px)`;
    style.backgroundColor =
      override.background ?? hexToRgba(theme.colors.card, Math.min(cards.opacity, 0.55));
    style.borderColor =
      override.borderWidth !== undefined ? borderColor : hexToRgba(theme.colors.text, 0.12);
  }
  if (preset === "flat" || preset === "minimal") {
    style.boxShadow = "none";
  }
  if (preset === "luxury") {
    style.borderColor =
      override.borderWidth !== undefined ? borderColor : hexToRgba(theme.colors.accent, 0.35);
    style.backgroundColor = override.background ?? theme.colors.surface;
  }
  return style;
}

export function buttonStyle(theme: TemplateTheme, override: BlockStyle = {}): CSSProperties {
  const b = theme.buttons;
  const primary = override.accentColor ?? theme.colors.primary;
  const common: CSSProperties = {
    minHeight: b.height,
    borderRadius: override.radius !== undefined ? override.radius : b.radius,
    fontWeight: b.fontWeight,
    borderStyle: "solid",
    borderWidth: b.borderWidth,
    borderColor: "transparent",
    boxShadow: shadow(override.shadow ?? b.shadow, theme.colors.accent, theme),
    transition:
      "transform .16s ease, box-shadow .16s ease, background-color .16s ease, opacity .16s ease",
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "0 16px",
    textDecoration: "none",
  };
  switch (b.variant) {
    case "outline":
      return {
        ...common,
        backgroundColor: "transparent",
        borderColor: theme.colors.border,
        color: theme.colors.text,
      };
    case "ghost":
      return {
        ...common,
        backgroundColor: "transparent",
        borderColor: "transparent",
        color: theme.colors.text,
        boxShadow: "none",
      };
    case "glass":
      return {
        ...common,
        backgroundColor: hexToRgba(theme.colors.text, 0.08),
        borderColor: hexToRgba(theme.colors.text, 0.14),
        color: theme.colors.text,
        backdropFilter: "blur(12px)",
      };
    case "gradient":
      return {
        ...common,
        backgroundImage: `linear-gradient(100deg, ${primary}, ${theme.colors.accent})`,
        color: readableOn(primary),
      };
    case "soft":
      return {
        ...common,
        backgroundColor: hexToRgba(primary, 0.14),
        color: primary,
        borderColor: "transparent",
      };
    case "solid":
    default:
      return { ...common, backgroundColor: primary, color: readableOn(primary) };
  }
}

export function headingStyle(theme: TemplateTheme, scale = 1): CSSProperties {
  return {
    fontFamily: theme.typography.headingFont,
    fontWeight: theme.typography.headingWeight,
    fontSize: `${Math.round(theme.typography.headingSize * scale)}px`,
    letterSpacing: `${theme.typography.letterSpacing}em`,
    lineHeight: 1.1,
    color: theme.colors.text,
    margin: 0,
  };
}

export function mutedStyle(theme: TemplateTheme): CSSProperties {
  return { color: theme.colors.mutedText };
}

export const ANIMATION_CLASS: Record<string, string> = {
  none: "",
  fade: "pts-anim-fade",
  slide: "pts-anim-slide",
  scale: "pts-anim-scale",
  "soft-rise": "pts-anim-rise",
  "slide-up": "pts-anim-slide-up",
  "scale-in": "pts-anim-scale-in",
};

export const HOVER_CLASS: Record<string, string> = {
  none: "",
  lift: "pts-hover-lift",
  "soft-scale": "pts-hover-scale",
  glow: "pts-hover-glow",
  "border-emphasis": "pts-hover-border",
};

export function motionCssVars(duration: number): Record<string, string> {
  return {
    ["--pts-motion-duration" as string]: `${duration}ms`,
  };
}
