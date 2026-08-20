/**
 * Tipos para QR Code Styling avanzado
 */

export type DotsType = "rounded" | "dots" | "classy" | "classy-rounded" | "square" | "extra-rounded" | "diamond" | "star";
export type CornerSquareType = "dot" | "square" | "extra-rounded";
export type CornerDotType = "dot" | "square";
export type GradientType = "linear" | "radial";
export type QREffectType = "none" | "neon" | "glow" | "holographic" | "metallic-gold" | "metallic-silver" | "crystal" | "rainbow" | "aurora";

export interface GradientOptions {
  type: GradientType;
  rotation?: number; // 0-360 for linear
  colorStops: Array<{
    offset: number; // 0-1
    color: string;
  }>;
}

export interface QRAdvancedOptions {
  // Basic (compatible con sistema actual)
  data: string;
  width: number;
  height: number;
  margin?: number;

  // Colors (puede ser sólido o gradiente)
  dotsColor?: string | GradientOptions;
  backgroundColor?: string;

  // Advanced styling
  dotsType?: DotsType;
  cornersSquareType?: CornerSquareType;
  cornersDotType?: CornerDotType;

  // Effect
  effect?: QREffectType;

  // Logo
  image?: string;
  imageOptions?: {
    hideBackgroundDots?: boolean;
    imageSize?: number;
    margin?: number;
    crossOrigin?: string;
  };

  // Quality
  qrOptions?: {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  };
}

/**
 * Validar que el QR avanzado sea escaneable
 */
export interface QRValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Preset de estilo QR avanzado para plantillas
 */
export interface QRAdvancedPreset {
  name: string;
  dotsColor: string | GradientOptions;
  backgroundColor: string;
  dotsType?: DotsType;
  cornersSquareType?: CornerSquareType;
  cornersDotType?: CornerDotType;
  effect?: QREffectType;
}
