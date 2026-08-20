import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import type { DotType, Options } from "qr-code-styling";
import type { QRAdvancedOptions, DotsType } from "../../types/qr-advanced";
import { PREMIUM_EFFECTS, PREMIUM_KEYFRAMES } from "../../lib/premium-qr-presets";

interface QRCodeAdvancedProps {
  options: QRAdvancedOptions;
  className?: string;
  onRender?: (canvas: HTMLCanvasElement) => void;
}

const DEFAULT_LOGO_SIZE = 0.28;
const MAX_LOGO_SIZE = 0.32;
const DEFAULT_LOGO_MARGIN = 4;
const MIN_PROCESSED_LOGO_SIZE = 512;
const WHITE_THRESHOLD = 246;

function hexToRgb(hex?: string) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return {
    red: parseInt(hex.slice(1, 3), 16),
    green: parseInt(hex.slice(3, 5), 16),
    blue: parseInt(hex.slice(5, 7), 16),
  };
}

function recolorCanvasRegion(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number },
  color?: string,
  backgroundColor?: string,
) {
  const target = hexToRgb(color);
  if (!target) return;

  const background = hexToRgb(backgroundColor || "#ffffff") || {
    red: 255,
    green: 255,
    blue: 255,
  };
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;

  const x = Math.max(0, Math.round(region.x));
  const y = Math.max(0, Math.round(region.y));
  const width = Math.min(canvas.width - x, Math.round(region.width));
  const height = Math.min(canvas.height - y, Math.round(region.height));
  if (width <= 0 || height <= 0) return;

  try {
    const imageData = context.getImageData(x, y, width, height);
    const { data } = imageData;

    for (let i = 0; i < data.length; i += 4) {
      const red = data[i] ?? 0;
      const green = data[i + 1] ?? 0;
      const blue = data[i + 2] ?? 0;
      const alpha = data[i + 3] ?? 255;
      const bgDistance =
        Math.abs(red - background.red) +
        Math.abs(green - background.green) +
        Math.abs(blue - background.blue);

      if (alpha > 0 && bgDistance > 60) {
        data[i] = target.red;
        data[i + 1] = target.green;
        data[i + 2] = target.blue;
      }
    }

    context.putImageData(imageData, x, y);
  } catch {
    // Canvas may be tainted by a remote logo; leave QR untouched in that case.
  }
}

function applyCornerSquareColors(canvas: HTMLCanvasElement, options: QRAdvancedOptions) {
  const colors = options.cornerSquareColors;
  if (!colors) return;

  const size = Math.min(canvas.width, canvas.height);
  const finderSize = size * 0.26;

  recolorCanvasRegion(
    canvas,
    { x: 0, y: 0, width: finderSize, height: finderSize },
    colors.topLeft,
    options.backgroundColor,
  );
  recolorCanvasRegion(
    canvas,
    { x: size - finderSize, y: 0, width: finderSize, height: finderSize },
    colors.topRight,
    options.backgroundColor,
  );
  recolorCanvasRegion(
    canvas,
    { x: 0, y: size - finderSize, width: finderSize, height: finderSize },
    colors.bottomLeft,
    options.backgroundColor,
  );
}

async function removeWhiteBackground(src: string): Promise<string> {
  if (src.startsWith("data:image/svg+xml") || src.endsWith(".svg")) {
    return src;
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const scale = Math.max(1, MIN_PROCESSED_LOGO_SIZE / Math.max(sourceWidth, sourceHeight));
      const width = Math.round(sourceWidth * scale);
      const height = Math.round(sourceHeight * scale);
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        resolve(src);
        return;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);

      try {
        const imageData = context.getImageData(0, 0, width, height);
        const { data } = imageData;

        for (let i = 0; i < data.length; i += 4) {
          const red = data[i] ?? 0;
          const green = data[i + 1] ?? 0;
          const blue = data[i + 2] ?? 0;
          const min = Math.min(red, green, blue);
          const max = Math.max(red, green, blue);

          if (min >= WHITE_THRESHOLD && max - min <= 10) {
            data[i + 3] = 0;
          }
        }

        context.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(src);
      }
    };

    image.onerror = () => resolve(src);
    image.src = src;
  });
}

function getImageSize(options: QRAdvancedOptions) {
  const requestedSize = options.imageOptions?.imageSize ?? DEFAULT_LOGO_SIZE;
  return Math.min(requestedSize, MAX_LOGO_SIZE);
}

function normalizeDotsType(type?: DotsType): DotType {
  if (type === "diamond" || type === "star") return "classy-rounded";
  return type ?? "square";
}

function buildStylingOptions(options: QRAdvancedOptions, image?: string): Options {
  const stylingOptions: Options = {
    width: options.width,
    height: options.height,
    data: options.data,
    margin: options.margin ?? 4,
    qrOptions: {
      errorCorrectionLevel: options.qrOptions?.errorCorrectionLevel ?? "H",
    },
    imageOptions: {
      saveAsBlob: true,
      hideBackgroundDots: options.imageOptions?.hideBackgroundDots ?? true,
      imageSize: image ? getImageSize(options) : DEFAULT_LOGO_SIZE,
      margin: image ? (options.imageOptions?.margin ?? DEFAULT_LOGO_MARGIN) : 0,
      crossOrigin: options.imageOptions?.crossOrigin ?? "anonymous",
    },
    dotsOptions: {
      type: normalizeDotsType(options.dotsType),
      color: "#000000",
      roundSize: true,
    },
    backgroundOptions: {
      color: options.backgroundColor ?? "#ffffff",
    },
    cornersSquareOptions: {
      type: options.cornersSquareType ?? "extra-rounded",
      color: options.cornersSquareColor,
    },
    cornersDotOptions: {
      type: options.cornersDotType ?? "dot",
      color: options.cornersDotColor,
    },
  };

  if (image) {
    stylingOptions.image = image;
  }

  if (typeof options.dotsColor === "string") {
    stylingOptions.dotsOptions = {
      ...stylingOptions.dotsOptions,
      color: options.dotsColor,
    };
    stylingOptions.cornersSquareOptions = {
      ...stylingOptions.cornersSquareOptions,
      color: options.cornersSquareColor ?? options.dotsColor,
    };
    stylingOptions.cornersDotOptions = {
      ...stylingOptions.cornersDotOptions,
      color: options.cornersDotColor ?? options.dotsColor,
    };
  } else if (options.dotsColor && typeof options.dotsColor === "object") {
    const gradient = {
      type: options.dotsColor.type,
      rotation: options.dotsColor.rotation ?? 0,
      colorStops: options.dotsColor.colorStops.map((stop) => ({
        offset: stop.offset,
        color: stop.color,
      })),
    };

    stylingOptions.dotsOptions = {
      ...stylingOptions.dotsOptions,
      gradient,
    };
    stylingOptions.cornersSquareOptions = {
      ...stylingOptions.cornersSquareOptions,
      gradient,
      ...(options.cornersSquareColor ? { color: options.cornersSquareColor } : {}),
    };
    stylingOptions.cornersDotOptions = {
      ...stylingOptions.cornersDotOptions,
      gradient,
      ...(options.cornersDotColor ? { color: options.cornersDotColor } : {}),
    };
  }

  return stylingOptions;
}

/**
 * Componente QR avanzado con soporte para degradados, efectos y estilos personalizados
 * Usa qr-code-styling para renderizado avanzado
 */
export function QRCodeAdvanced({ options, className, onRender }: QRCodeAdvancedProps) {
  const ref = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;

    const render = async () => {
      const image = options.image ? await removeWhiteBackground(options.image) : undefined;
      if (cancelled || !ref.current) return;

      const stylingOptions = buildStylingOptions(options, image);

      // Crear o actualizar QR
      if (!qrCode.current) {
        qrCode.current = new QRCodeStyling(stylingOptions);
        qrCode.current.append(ref.current);
      } else {
        qrCode.current.update(stylingOptions);
      }

      const canvas = ref.current.querySelector("canvas");
      if (canvas) {
        applyCornerSquareColors(canvas, options);
      }

      // Aplicar efectos Premium
      if (canvas && options.effect && options.effect !== "none") {
        const effectStyle = PREMIUM_EFFECTS[options.effect as keyof typeof PREMIUM_EFFECTS];

        if (effectStyle) {
          canvas.style.filter = effectStyle.filter;

          if ("animation" in effectStyle && effectStyle.animation) {
            canvas.style.animation = effectStyle.animation;
          }

          if ("backdropFilter" in effectStyle && effectStyle.backdropFilter) {
            canvas.style.backdropFilter = effectStyle.backdropFilter;
          }

          // Para efectos básicos que necesitan color
          if (
            (options.effect === "neon" || options.effect === "glow") &&
            typeof options.dotsColor === "string"
          ) {
            canvas.style.color = options.dotsColor;
          }
        }
      }

      if (canvas && onRender) {
        onRender(canvas);
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [options, onRender]);

  // Inyectar keyframes CSS para animaciones
  useEffect(() => {
    const styleId = "premium-qr-animations";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = PREMIUM_KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  return <div ref={ref} className={className} />;
}

/**
 * Hook para descargar QR avanzado
 */
export function useQRAdvancedDownload() {
  const download = async (
    options: QRAdvancedOptions,
    filename: string,
    format: "png" | "svg" = "png",
  ) => {
    try {
      const image = options.image ? await removeWhiteBackground(options.image) : undefined;
      const stylingOptions = buildStylingOptions(options, image);

      const qr = new QRCodeStyling(stylingOptions);

      if (format === "png") {
        const blob = await qr.getRawData("png");
        if (!blob) {
          throw new Error("Failed to generate PNG: getRawData returned null");
        }
        let outputBlob = blob as Blob;
        if (options.cornerSquareColors) {
          outputBlob = await new Promise<Blob>((resolve) => {
            const image = new Image();
            image.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = options.width;
              canvas.height = options.height;
              const context = canvas.getContext("2d");
              if (!context) {
                resolve(blob as Blob);
                return;
              }
              context.drawImage(image, 0, 0, options.width, options.height);
              applyCornerSquareColors(canvas, options);
              canvas.toBlob(
                (processedBlob) => resolve(processedBlob || (blob as Blob)),
                "image/png",
              );
              URL.revokeObjectURL(image.src);
            };
            image.onerror = () => resolve(blob as Blob);
            image.src = URL.createObjectURL(blob as Blob);
          });
        }

        const url = URL.createObjectURL(outputBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Modified by Claude Code — QR-STUDIO-CLOSE-10B
        const blob = await qr.getRawData("svg");
        if (!blob) {
          throw new Error("Failed to generate SVG: getRawData returned null");
        }

        // Verify SVG is self-contained (no external image URLs)
        const svgText = await blob.text();
        const externalUrlPattern = /(?:href|xlink:href)=["']https?:\/\/[^"']+["']/i;
        if (externalUrlPattern.test(svgText)) {
          throw new Error(
            "SVG avanzado contiene referencias externas. La librería no pudo incrustar el logo.",
          );
        }

        const url = URL.createObjectURL(blob as Blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Advanced QR download failed:", error);
      throw error; // Re-throw to let caller handle it
    }
  };

  return { download };
}
