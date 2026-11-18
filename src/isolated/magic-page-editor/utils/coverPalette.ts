/*
 * "Combinar colores con mi portada" — local cover-colour analysis.
 *
 * Everything here runs in the browser on the hero image the page already shows.
 * No service is called, no generative model is involved, no pixel or business
 * datum leaves the tab: the image is drawn once into a 64x64 canvas, read back
 * with `getImageData` and reduced to a handful of quantised colours that are
 * then discarded. The only thing that ever reaches the document is the seven hex
 * tokens a proposal carries.
 *
 * The module is deliberately pure apart from `analyzeCoverImage`, which is the
 * single DOM boundary: every other export takes plain data so it can be unit
 * tested without a browser, and so the palette maths is provably deterministic
 * (no `Math.random`, stable sorts with explicit tie-breakers).
 *
 * The WCAG maths is not restated here: `utils/brandingContrast.ts` already owns
 * the tested `parseHexColor` / `relativeLuminance` / `contrastRatio` trio, and
 * this module reuses it through a small Rgb adapter so a palette proposal and
 * the branding line can never disagree about what "readable" means.
 */
import { loadImageDeterministic } from "../../../lib/qr-export/loadImage";
import {
  contrastRatio as hexContrastRatio,
  parseHexColor,
  relativeLuminance as hexLuminance,
} from "./brandingContrast";

/* ------------------------------------------------------------------ */
/* Colour primitives                                                   */
/* ------------------------------------------------------------------ */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** The dark/light pair `readableOn` in useThemeTokens chooses between. */
const INK = { r: 0x21, g: 0x1d, b: 0x19 };
const PAPER = { r: 0xfb, g: 0xf6, b: 0xee };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hex2(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0").toUpperCase();
}

export function rgbToHex(rgb: Rgb): string {
  return `#${hex2(rgb.r)}${hex2(rgb.g)}${hex2(rgb.b)}`;
}

/** Adapts the shared hex parser to the Rgb shape the palette maths works in. */
export function hexToRgb(value: string): Rgb | null {
  const parsed = parseHexColor(value);
  return parsed ? { r: parsed[0], g: parsed[1], b: parsed[2] } : null;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;
  return { h: (((h * 60) % 360) + 360) % 360, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

/** WCAG relative luminance, via the shared implementation. */
export function relativeLuminance(rgb: Rgb): number {
  return hexLuminance(rgbToHex(rgb)) ?? 0;
}

/** WCAG contrast ratio, 1..21, via the shared implementation. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  return hexContrastRatio(rgbToHex(a), rgbToHex(b)) ?? 1;
}

/** Mirrors `readableOn` in useThemeTokens (threshold 0.42 on the luminance). */
export function readableOn(color: Rgb): Rgb {
  return relativeLuminance(color) > 0.42 ? INK : PAPER;
}

/**
 * Push `fg` away from `bg` in lightness until `minRatio` is met.
 *
 * Stepping lightness (rather than swapping to pure black/white) keeps the hue
 * the image contributed, so an adjusted palette still reads as "from my cover".
 * The pure extremes are only a last resort, when even a fully saturated end of
 * the axis cannot reach the ratio.
 *
 * The direction is decided by the background's LUMINANCE, not its HSL lightness.
 * They disagree exactly where it matters: `#FFC700` has `l = 0.5` but is a bright
 * surface, so an HSL test would lighten the foreground and lose contrast. The
 * 0.1791 pivot is where black and white become equally readable on `bg`
 * (`(L + 0.05)² = 1.05 × 0.05`), so the chosen end of the axis always clears the
 * floor for a 4.5 target.
 */
export function ensureContrast(fg: Rgb, bg: Rgb, minRatio: number): Rgb {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  const hsl = rgbToHsl(fg);
  const direction = relativeLuminance(bg) > 0.1791 ? -1 : 1;
  let best = fg;
  let bestRatio = contrastRatio(fg, bg);
  for (let step = 1; step <= 25; step += 1) {
    const candidate = hslToRgb({
      h: hsl.h,
      s: hsl.s,
      l: clamp(hsl.l + direction * step * 0.04, 0, 1),
    });
    const ratio = contrastRatio(candidate, bg);
    if (ratio >= minRatio) return candidate;
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  const extreme = direction < 0 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  return contrastRatio(extreme, bg) > bestRatio ? extreme : best;
}

/* ------------------------------------------------------------------ */
/* Extraction                                                          */
/* ------------------------------------------------------------------ */

/** 4 bits per channel: 4096 buckets, enough to separate the tones a cover holds. */
const BUCKET_BITS = 4;
const DEFAULT_SAMPLE_SIZE = 64;
const DEFAULT_MAX_SAMPLES = 14;

export interface CoverSample {
  hex: string;
  rgb: Rgb;
  hsl: Hsl;
  /** Fraction of the sampled pixels this bucket stands for (0..1). */
  share: number;
}

export interface CoverImageData {
  data: Uint8ClampedArray | Uint8Array;
}

/**
 * Quantise the pixels into buckets and return the most represented ones.
 *
 * Deterministic by construction: the histogram is keyed by bucket, and the sort
 * breaks ties on the bucket key (ascending) so equal counts always resolve the
 * same way. Fully transparent pixels are ignored — a cover with a cut-out would
 * otherwise read as "mostly transparency".
 */
export function extractCoverColors(
  image: CoverImageData,
  maxSamples: number = DEFAULT_MAX_SAMPLES,
): CoverSample[] {
  const pixels = image.data;
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();
  let total = 0;

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3]! < 128) continue;
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const key =
      ((r >> (8 - BUCKET_BITS)) << (BUCKET_BITS * 2)) |
      ((g >> (8 - BUCKET_BITS)) << BUCKET_BITS) |
      (b >> (8 - BUCKET_BITS));
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
    total += 1;
  }

  if (total === 0) return [];

  const ordered = Array.from(buckets.entries())
    .map(([key, bucket]) => ({
      key,
      rgb: {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
      },
      count: bucket.count,
    }))
    .sort((a, b) => b.count - a.count || a.key - b.key);

  return ordered.slice(0, maxSamples).map((entry) => ({
    hex: rgbToHex(entry.rgb),
    rgb: entry.rgb,
    hsl: rgbToHsl(entry.rgb),
    share: entry.count / total,
  }));
}

/**
 * The sample that best represents the cover's identity: well represented in the
 * image and actually coloured. A grey wall of pixels should not win over the
 * smaller but saturated subject, which is why saturation is weighted in.
 */
export function pickAccentSample(samples: readonly CoverSample[]): CoverSample | undefined {
  if (samples.length === 0) return undefined;
  const coloured = samples.filter(
    (sample) =>
      sample.share >= 0.005 && sample.hsl.s >= 0.12 && sample.hsl.l > 0.1 && sample.hsl.l < 0.9,
  );
  const pool = coloured.length > 0 ? coloured : samples;
  let best = pool[0]!;
  let bestScore = -1;
  pool.forEach((sample) => {
    const score = sample.share * (0.35 + sample.hsl.s);
    if (score > bestScore) {
      bestScore = score;
      best = sample;
    }
  });
  return best;
}

/* ------------------------------------------------------------------ */
/* Proposals                                                           */
/* ------------------------------------------------------------------ */

export type CoverPaletteKind = "natural" | "elegant" | "vibrant";

/** The seven page tokens `useThemeTokens` reads. */
export interface CoverPaletteTokens {
  bg: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  lineColor: string;
  accent: string;
  accentFg: string;
}

export interface CoverPaletteProposal {
  kind: CoverPaletteKind;
  label: string;
  description: string;
  tokens: CoverPaletteTokens;
  swatches: string[];
}

/** Text must clear AA on the page background; secondary text only needs the UI floor. */
const TEXT_CONTRAST = 4.5;
const MUTED_CONTRAST = 3;
const ACCENT_FG_CONTRAST = 3;

/**
 * The accent foreground: whichever of the two house extremes reads better on
 * the accent, nudged until it clears the UI floor. Mirrors the intent of
 * `readableOn`, but validated rather than assumed — an accent close to the 0.42
 * threshold would otherwise pick the worse of the two.
 */
function accentForeground(accent: Rgb): Rgb {
  const light = contrastRatio(PAPER, accent);
  const dark = contrastRatio(INK, accent);
  const chosen = light >= dark ? PAPER : INK;
  return ensureContrast(chosen, accent, ACCENT_FG_CONTRAST);
}

function toTokens(parts: {
  bg: Rgb;
  text: Rgb;
  muted: Rgb;
  surface: Rgb;
  line: Rgb;
  accent: Rgb;
}): CoverPaletteTokens {
  return {
    bg: rgbToHex(parts.bg),
    textColor: rgbToHex(ensureContrast(parts.text, parts.bg, TEXT_CONTRAST)),
    mutedColor: rgbToHex(ensureContrast(parts.muted, parts.bg, MUTED_CONTRAST)),
    surfaceColor: rgbToHex(parts.surface),
    lineColor: rgbToHex(parts.line),
    accent: rgbToHex(parts.accent),
    accentFg: rgbToHex(accentForeground(parts.accent)),
  };
}

function swatchesOf(tokens: CoverPaletteTokens): string[] {
  return [tokens.bg, tokens.surfaceColor, tokens.accent, tokens.mutedColor, tokens.textColor];
}

function proposal(
  kind: CoverPaletteKind,
  label: string,
  description: string,
  tokens: CoverPaletteTokens,
): CoverPaletteProposal {
  return { kind, label, description, tokens, swatches: swatchesOf(tokens) };
}

/**
 * Three readings of the same cover, all derived from one sampled hue so they
 * stay recognisably "this image" — they differ in how much of it they keep.
 *
 * - Natural keeps the cover's own temperature: a tinted background, a soft
 *   accent at the colour the image actually shows.
 * - Elegant drains it to a near-neutral page and takes the accent deeper.
 * - Vibrant keeps a clean page and pushes the accent, capped below neon.
 */
export function proposeCoverPalettes(samples: readonly CoverSample[]): CoverPaletteProposal[] {
  const accentSample = pickAccentSample(samples);
  if (!accentSample) return [];
  const hue = accentSample.hsl.h;
  const sat = accentSample.hsl.s;
  const light = accentSample.hsl.l;
  // A black-and-white cover has a hue only by convention (0). Inventing a warm
  // accent for a greyscale photograph would be a lie about the image, so an
  // achromatic sample keeps its accents neutral and only the lightness differs.
  const hasChroma = sat >= 0.12;
  const accentSat = (factor: number, min: number, max: number) =>
    hasChroma ? clamp(sat * factor, min, max) : 0;

  const natural = toTokens({
    bg: hslToRgb({ h: hue, s: clamp(sat * 0.35, 0.04, 0.26), l: 0.96 }),
    surface: hslToRgb({ h: hue, s: clamp(sat * 0.2, 0.02, 0.14), l: 0.995 }),
    text: hslToRgb({ h: hue, s: clamp(sat * 0.5, 0.05, 0.34), l: 0.14 }),
    muted: hslToRgb({ h: hue, s: clamp(sat * 0.34, 0.04, 0.24), l: 0.44 }),
    line: hslToRgb({ h: hue, s: clamp(sat * 0.3, 0.03, 0.2), l: 0.88 }),
    accent: hslToRgb({ h: hue, s: accentSat(0.9, 0.34, 0.7), l: clamp(light, 0.3, 0.48) }),
  });

  const elegant = toTokens({
    bg: hslToRgb({ h: hue, s: clamp(sat * 0.1, 0.01, 0.06), l: 0.975 }),
    surface: hslToRgb({ h: hue, s: 0.025, l: 0.998 }),
    text: hslToRgb({ h: hue, s: 0.06, l: 0.12 }),
    muted: hslToRgb({ h: hue, s: 0.05, l: 0.45 }),
    line: hslToRgb({ h: hue, s: 0.05, l: 0.9 }),
    accent: hslToRgb({ h: hue, s: accentSat(0.45, 0.18, 0.4), l: clamp(light * 0.62, 0.18, 0.3) }),
  });

  const vibrant = toTokens({
    bg: hslToRgb({ h: hue, s: 0.02, l: 0.99 }),
    surface: { r: 255, g: 255, b: 255 },
    text: hslToRgb({ h: hue, s: 0.08, l: 0.1 }),
    muted: hslToRgb({ h: hue, s: 0.06, l: 0.42 }),
    line: hslToRgb({ h: hue, s: 0.06, l: 0.9 }),
    accent: hslToRgb({ h: hue, s: accentSat(1.15, 0.55, 0.8), l: clamp(light, 0.32, 0.46) }),
  });

  return [
    proposal(
      "natural",
      "Natural",
      "Conserva los tonos de tu portada, suaves y coherentes.",
      natural,
    ),
    proposal("elegant", "Elegante", "Menos saturación y un acento más profundo.", elegant),
    proposal("vibrant", "Vibrante", "Acento más intenso y más contraste, sin neón.", vibrant),
  ];
}

/* ------------------------------------------------------------------ */
/* Provenance                                                          */
/* ------------------------------------------------------------------ */

/** Where a derived palette came from. The cover is the only origin today. */
export type CoverPaletteSource = "hero";

/** The page props recording where an applied cover palette came from. */
export const COVER_PALETTE_SOURCE_KEY = "coverPaletteSource";
export const COVER_PALETTE_MODE_KEY = "coverPaletteMode";
export const COVER_PALETTE_IMAGE_SRC_KEY = "coverPaletteImageSrc";

/**
 * The three provenance props written in the SAME patch as the seven tokens.
 *
 * Plain strings, deliberately: `hasValidMagicPayload` (document-session.ts:32)
 * rejects any non-string prop value, so an object or a `null` here would degrade
 * the whole document to UNKNOWN on the next load and the host would show
 * "Documento no compatible". No pixels, no image data, no personal information —
 * only which cover was read and which of the three readings was chosen.
 */
export function coverPaletteProvenance(
  kind: CoverPaletteKind,
  imageSrc: string,
): Record<string, string> {
  return {
    [COVER_PALETTE_SOURCE_KEY]: "hero",
    [COVER_PALETTE_MODE_KEY]: kind,
    [COVER_PALETTE_IMAGE_SRC_KEY]: imageSrc,
  };
}

/** True when the page carries a palette that was derived from its own cover. */
export function hasCoverPalette(page: Record<string, string>): boolean {
  return (page[COVER_PALETTE_SOURCE_KEY] ?? "") === "hero";
}

/** The image the applied palette was read from, or "" when there is none. */
export function coverPaletteImageSrc(page: Record<string, string>): string {
  return page[COVER_PALETTE_IMAGE_SRC_KEY] ?? "";
}

/**
 * True when the palette on the page was read from a DIFFERENT image than the one
 * the hero shows now — the signal behind "tu portada cambió".
 *
 * Deliberately derived, never stored: the notice disappears the moment a new
 * palette is applied, because the apply rewrites `coverPaletteImageSrc`. A page
 * that never used this feature has no source prop, so it can never be reported
 * as stale.
 */
export function coverPaletteIsStale(page: Record<string, string>, currentSrc: string): boolean {
  if (!hasCoverPalette(page)) return false;
  const derived = coverPaletteImageSrc(page);
  return derived !== "" && derived !== currentSrc;
}

/* ------------------------------------------------------------------ */
/* DOM boundary                                                        */
/* ------------------------------------------------------------------ */

export type CoverAnalysisErrorCode = "load" | "cors" | "empty" | "unsupported";

export class CoverPaletteError extends Error {
  readonly code: CoverAnalysisErrorCode;

  constructor(code: CoverAnalysisErrorCode, message: string) {
    super(message);
    this.name = "CoverPaletteError";
    this.code = code;
  }
}

/** The one message the UI shows when the browser refuses to hand us the pixels. */
export const COVER_ANALYSIS_FAILED = "No pudimos analizar automáticamente esta imagen.";

export interface CoverAnalysisMessage {
  /** The sentence the feature has always shown, kept verbatim. */
  headline: string;
  /** What actually failed and what the owner can do about it. */
  detail: string;
}

/**
 * One message per failure cause.
 *
 * The four codes used to reach the UI as a single dead end: a missing network,
 * a cross-origin image, a colourless photo and a browser without a 2D context
 * all produced the same sentence, which is useless to the person holding the
 * phone. The headline stays exactly as approved; `detail` is what turns each
 * cause into something the owner can act on.
 */
export const COVER_ANALYSIS_MESSAGES: Record<CoverAnalysisErrorCode, CoverAnalysisMessage> = {
  load: {
    headline: COVER_ANALYSIS_FAILED,
    detail: "No se pudo cargar la imagen. Revisa tu conexión e inténtalo de nuevo.",
  },
  cors: {
    headline: COVER_ANALYSIS_FAILED,
    detail:
      "Está alojada fuera de tu página y bloquea la lectura de sus colores. Súbela desde el editor para poder combinarla.",
  },
  empty: {
    headline: COVER_ANALYSIS_FAILED,
    detail:
      "No encontramos colores suficientes en esta imagen. Prueba con una portada con más variedad de tonos.",
  },
  unsupported: {
    headline: COVER_ANALYSIS_FAILED,
    detail:
      "Tu navegador no permite leer imágenes en este contexto. Puedes ajustar los colores a mano.",
  },
};

function readDownscaled(image: HTMLImageElement, size: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new CoverPaletteError("unsupported", COVER_ANALYSIS_FAILED);
  context.drawImage(image, 0, 0, size, size);
  try {
    return context.getImageData(0, 0, size, size);
  } catch {
    // A tainted canvas throws on read, not on draw: this is the CORS path.
    throw new CoverPaletteError("cors", COVER_ANALYSIS_FAILED);
  }
}

/** Anything the browser hands us pixels for without asking another origin. */
function isSameOrigin(src: string): boolean {
  try {
    const url = new URL(src, window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return true;
    return url.origin === window.location.origin;
  } catch {
    return true;
  }
}

/**
 * Would this image load at all if we did not ask for CORS?
 *
 * A cross-origin cover that refuses `crossOrigin="anonymous"` fails identically
 * whether the host is unreachable or merely omits `Access-Control-Allow-Origin`,
 * and those two need opposite advice ("check your connection" vs "upload it from
 * the editor"). Measured in a real browser, the plain request is what separates
 * them: if it loads, the file is reachable and only the CORS check stopped us.
 * Nothing is drawn from this probe — it only reports whether the bytes arrive.
 */
function loadsWithoutCors(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    const finish = (loaded: boolean) => {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };
    const timer = window.setTimeout(() => finish(false), 4000);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
  });
}

/**
 * Load the cover, sample it, and return the three proposals.
 *
 * Deliberately downscales to 64x64 before reading: a 4000px cover carries no
 * extra colour information at this granularity, and the small canvas keeps the
 * whole analysis inside one frame. Every failure mode — offline, blocked by
 * CORS, no 2D context — surfaces as a `CoverPaletteError` so the panel can show
 * one message and leave the document untouched.
 */
export async function analyzeCoverImage(src: string): Promise<CoverPaletteProposal[]> {
  let image: HTMLImageElement;
  try {
    image = await loadImageDeterministic(src, { crossOrigin: "anonymous", timeout: 10000 });
  } catch {
    // A same-origin image that fails to load really did fail to load. A
    // cross-origin one usually did not: the host simply will not let us read it.
    // Ask the browser which of the two happened rather than guessing, so the
    // owner gets the advice that actually applies.
    if (isSameOrigin(src) || !(await loadsWithoutCors(src))) {
      throw new CoverPaletteError("load", COVER_ANALYSIS_FAILED);
    }
    throw new CoverPaletteError("cors", COVER_ANALYSIS_FAILED);
  }
  const samples = extractCoverColors(readDownscaled(image, DEFAULT_SAMPLE_SIZE));
  if (samples.length === 0) throw new CoverPaletteError("empty", COVER_ANALYSIS_FAILED);
  const proposals = proposeCoverPalettes(samples);
  if (proposals.length === 0) throw new CoverPaletteError("empty", COVER_ANALYSIS_FAILED);
  return proposals;
}
