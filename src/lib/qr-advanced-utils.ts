import type { QRAdvancedOptions, QRValidationResult, GradientOptions } from "../types/qr-advanced";
import { getContrast, getLuminance } from "./qr-utils";

/**
 * Validar que un QR avanzado sea escaneable
 */
export function validateAdvancedQR(options: QRAdvancedOptions): QRValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Validar contraste
  if (typeof options.dotsColor === "string") {
    // Color sólido - validación simple
    const contrast = getContrast(options.dotsColor, options.backgroundColor ?? "#ffffff");

    if (contrast < 3.0) {
      errors.push("Contraste muy bajo. El QR puede no ser escaneable.");
    } else if (contrast < 4.5) {
      warnings.push("Contraste bajo. Puede tener problemas en algunas condiciones de luz.");
    }

    // Verificar que foreground sea más oscuro que background
    const fgLum = getLuminance(options.dotsColor);
    const bgLum = getLuminance(options.backgroundColor ?? "#ffffff");

    if (fgLum > bgLum) {
      warnings.push("Se recomienda usar un patrón oscuro sobre fondo claro.");
    }
  } else if (options.dotsColor && typeof options.dotsColor === "object") {
    // Gradiente - validar cada color stop
    const gradient = options.dotsColor as GradientOptions;
    const bgColor = options.backgroundColor ?? "#ffffff";

    for (const stop of gradient.colorStops) {
      const contrast = getContrast(stop.color, bgColor);

      if (contrast < 3.0) {
        errors.push(`Color de gradiente ${stop.color} tiene contraste muy bajo.`);
      } else if (contrast < 4.5) {
        warnings.push(`Color de gradiente ${stop.color} tiene contraste bajo.`);
      }
    }

    // Verificar que todos los colores del gradiente sean suficientemente oscuros
    const hasLightColor = gradient.colorStops.some(
      (stop) => getLuminance(stop.color) > 0.5
    );

    if (hasLightColor) {
      warnings.push("El gradiente contiene colores claros que pueden dificultar el escaneo.");
    }
  }

  // 2. Validar tamaño
  if (options.width < 200 || options.height < 200) {
    warnings.push("Tamaño muy pequeño. Se recomienda al menos 200x200px para impresión.");
  }

  // 3. Validar margin (quiet zone)
  const margin = options.margin ?? 4;
  if (margin < 2) {
    warnings.push("Margen muy pequeño. Se recomienda al menos 4 módulos de quiet zone.");
  }

  // 4. Validar dots type con gradientes
  if (
    options.dotsColor &&
    typeof options.dotsColor === "object" &&
    (options.dotsType === "dots" || options.dotsType === "classy")
  ) {
    warnings.push(
      "Dots type 'dots' o 'classy' con gradiente puede reducir la confiabilidad del escaneo."
    );
  }

  // 5. Validar logo
  if (options.image) {
    const imageSize = options.imageOptions?.imageSize ?? 0.4;

    if (imageSize > 0.3) {
      warnings.push("Logo muy grande. Se recomienda no exceder 30% del área del QR.");
    }

    if (options.qrOptions?.errorCorrectionLevel === "L") {
      warnings.push("Error correction 'L' con logo puede causar problemas. Usa 'H' para logos.");
    }
  }

  // 6. Validar efectos
  if (options.effect && options.effect !== "none") {
    warnings.push("Los efectos visuales son solo cosméticos y no afectan el escaneo.");
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    warnings,
    errors,
  };
}

/**
 * Crear opciones de QR avanzado desde configuración simple (backward compatibility)
 */
export function createAdvancedOptionsFromSimple(
  data: string,
  foregroundColor: string,
  backgroundColor: string,
  size: number,
  logoUrl?: string,
  logoEnabled?: boolean
): QRAdvancedOptions {
  return {
    data,
    width: size,
    height: size,
    margin: 4,
    dotsColor: foregroundColor,
    backgroundColor,
    dotsType: "square",
    ...(logoEnabled && logoUrl ? { image: logoUrl } : {}),
    ...(logoEnabled && logoUrl ? {
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.18, // 18% del área
        margin: 8,
        crossOrigin: "anonymous",
      }
    } : {}),
    qrOptions: {
      errorCorrectionLevel: "H",
    },
  };
}

/**
 * Detectar si opciones requieren renderer avanzado
 */
export function requiresAdvancedRenderer(
  foregroundColor: string | GradientOptions,
  dotsType?: string,
  effect?: string
): boolean {
  // Si es gradiente, necesita renderer avanzado
  if (typeof foregroundColor === "object") {
    return true;
  }

  // Si tiene dots type personalizado
  if (dotsType && dotsType !== "square") {
    return true;
  }

  // Si tiene efectos
  if (effect && effect !== "none") {
    return true;
  }

  return false;
}
