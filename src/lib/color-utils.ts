/**
 * Extrae un color hex de un posible degradado u otro formato complejo.
 */
export function extractSolidHex(colorString: string): string {
  if (!colorString) return "#ffffff";
  const hexMatch = colorString.match(/#([0-9a-f]{3}|[0-9a-f]{6})/i);
  return hexMatch ? hexMatch[0] : "#ffffff";
}

/**
 * Convierte un color hex a RGB
 */
export function hexToRgb(hexString: string): { r: number; g: number; b: number } {
  const hex = extractSolidHex(hexString);
  let r = 255, g = 255, b = 255;
  if (hex.length === 4) {
    r = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    g = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    b = parseInt(hex.charAt(3) + hex.charAt(3), 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return { r, g, b };
}

/**
 * Calcula la luminancia relativa (sRGB) segn WCAG
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const R = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const G = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const B = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calcula el ratio de contraste entre dos colores segn WCAG
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  
  return (lightest + 0.05) / (darkest + 0.05);
}

/**
 * Mezcla un color en foreground con alpha sobre un background slido.
 */
export function mixColorsAlpha(fgHex: string, bgHex: string, alpha: number): string {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);

  const r = Math.round(fg.r * alpha + bg.r * (1 - alpha));
  const g = Math.round(fg.g * alpha + bg.g * (1 - alpha));
  const b = Math.round(fg.b * alpha + bg.b * (1 - alpha));

  const toHex = (n: number) => {
    const h = Math.max(0, Math.min(255, n)).toString(16);
    return h.length === 1 ? "0" + h : h;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export type ContrastResult = "PASS" | "WARNING" | "POOR";

/**
 * Evalua el contraste y retorna un veredicto prctico
 */
export function evaluateContrast(foreground: string, background: string): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  if (ratio >= 4.5) return "PASS";
  if (ratio >= 3) return "WARNING";
  return "POOR";
}

/**
 * Sugiere un color de texto seguro (blanco o negro) sobre un fondo.
 */
export function getRecommendedTextColor(background: string): string {
  const whiteRatio = contrastRatio("#FFFFFF", background);
  const blackRatio = contrastRatio("#111111", background);
  return whiteRatio >= blackRatio ? "#FFFFFF" : "#111111";
}
