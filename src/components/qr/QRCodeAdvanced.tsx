import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import type { DotType, Options } from "qr-code-styling";
import type { QRAdvancedOptions, DotsType } from "../../types/qr-advanced";
import { PREMIUM_EFFECTS, PREMIUM_KEYFRAMES } from "../../lib/premium-qr-presets";
import { normalizeQRFrameStyle } from "./QRFrameShell";

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
  const finderSize = size * 0.245;
  const innerSize = finderSize * 0.38;
  const innerOffset = finderSize * 0.31;
  const squareFallback =
    options.cornersSquareColor ||
    (typeof options.dotsColor === "string" ? options.dotsColor : "#000000");

  // Modified by Codex — QR-STUDIO-11C
  recolorCanvasRegion(
    canvas,
    { x: 0, y: 0, width: finderSize, height: finderSize },
    colors.topLeft || squareFallback,
    options.backgroundColor,
  );
  recolorCanvasRegion(
    canvas,
    { x: size - finderSize, y: 0, width: finderSize, height: finderSize },
    colors.topRight || squareFallback,
    options.backgroundColor,
  );
  recolorCanvasRegion(
    canvas,
    { x: 0, y: size - finderSize, width: finderSize, height: finderSize },
    colors.bottomLeft || squareFallback,
    options.backgroundColor,
  );

  if (options.cornersDotColor) {
    recolorCanvasRegion(
      canvas,
      { x: innerOffset, y: innerOffset, width: innerSize, height: innerSize },
      options.cornersDotColor,
      options.backgroundColor,
    );
    recolorCanvasRegion(
      canvas,
      { x: size - finderSize + innerOffset, y: innerOffset, width: innerSize, height: innerSize },
      options.cornersDotColor,
      options.backgroundColor,
    );
    recolorCanvasRegion(
      canvas,
      { x: innerOffset, y: size - finderSize + innerOffset, width: innerSize, height: innerSize },
      options.cornersDotColor,
      options.backgroundColor,
    );
  }
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function blobToImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo preparar el QR para el marco."));
    };
    image.src = url;
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo convertir el QR exportado."));
    reader.readAsDataURL(blob);
  });
}

// Modified by Codex — QR-STUDIO-11C
async function composeQRFrameBlob(qrBlob: Blob, options: QRAdvancedOptions) {
  const frameStyle = normalizeQRFrameStyle(options.frameStyle);
  if (frameStyle === "plain") return qrBlob;

  const image = await blobToImage(qrBlob);
  const canvas = document.createElement("canvas");
  const size = Math.max(options.width, options.height);
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return qrBlob;

  context.clearRect(0, 0, size, size);
  context.shadowColor = "rgba(15, 23, 42, 0.18)";
  context.shadowBlur = size * 0.035;
  context.shadowOffsetY = size * 0.018;

  if (frameStyle === "stamp") {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
    context.fill();
    context.shadowColor = "transparent";
    context.strokeStyle = options.cornersSquareColor || "#111827";
    context.lineWidth = size * 0.014;
    context.setLineDash([size * 0.035, size * 0.02]);
    context.beginPath();
    context.arc(size / 2, size / 2, size * 0.41, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  } else if (frameStyle === "badge") {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.moveTo(size * 0.08, size * 0.08);
    context.lineTo(size * 0.78, size * 0.08);
    context.lineTo(size * 0.93, size * 0.5);
    context.lineTo(size * 0.78, size * 0.92);
    context.lineTo(size * 0.08, size * 0.92);
    context.closePath();
    context.fill();
    context.shadowColor = "transparent";
    context.fillStyle = "#e5e7eb";
    context.beginPath();
    context.arc(size * 0.78, size * 0.5, size * 0.035, 0, Math.PI * 2);
    context.fill();
  } else if (frameStyle === "phone") {
    context.fillStyle = "#0f172a";
    drawRoundedRect(context, size * 0.08, size * 0.04, size * 0.84, size * 0.92, size * 0.12);
    context.fill();
    context.shadowColor = "transparent";
    context.fillStyle = "rgba(255,255,255,0.25)";
    drawRoundedRect(context, size * 0.38, size * 0.075, size * 0.24, size * 0.025, size * 0.012);
    context.fill();
  } else if (frameStyle === "bottle") {
    const gradient = context.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, "#34d399");
    gradient.addColorStop(1, "#047857");
    context.fillStyle = gradient;
    drawRoundedRect(context, size * 0.16, size * 0.16, size * 0.68, size * 0.76, size * 0.16);
    context.fill();
    drawRoundedRect(context, size * 0.34, size * 0.04, size * 0.32, size * 0.2, size * 0.08);
    context.fill();
  }

  const padding = frameStyle === "bottle" ? size * 0.17 : size * 0.14;
  const qrSize = size - padding * 2;
  context.shadowColor = "transparent";
  context.fillStyle = "#ffffff";
  drawRoundedRect(
    context,
    padding * 0.82,
    padding * 0.82,
    qrSize + padding * 0.36,
    qrSize + padding * 0.36,
    size * 0.035,
  );
  context.fill();
  context.drawImage(image, padding, padding, qrSize, qrSize);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((processedBlob) => resolve(processedBlob || qrBlob), "image/png");
  });
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
      ...(options.cornersSquareColor ? { color: options.cornersSquareColor } : {}),
    },
    cornersDotOptions: {
      type: options.cornersDotType ?? "dot",
      ...(options.cornersDotColor ? { color: options.cornersDotColor } : {}),
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

      // Esperar a que qr-code-styling termine de dibujar el canvas asíncronamente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((qrCode.current as any)._canvasDrawingPromise) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (qrCode.current as any)._canvasDrawingPromise;
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
        outputBlob = await composeQRFrameBlob(outputBlob, options);

        const url = URL.createObjectURL(outputBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Modified by Claude Code — QR-STUDIO-CLOSE-10B
        const needsCanvasExport =
          normalizeQRFrameStyle(options.frameStyle) !== "plain" || !!options.cornerSquareColors;
        const blob = await qr.getRawData(needsCanvasExport ? "png" : "svg");
        if (!blob) {
          throw new Error("Failed to generate SVG: getRawData returned null");
        }

        if (needsCanvasExport) {
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

          outputBlob = await composeQRFrameBlob(outputBlob, options);
          const dataUrl = await blobToDataUrl(outputBlob);
          const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}"><image href="${dataUrl}" width="${options.width}" height="${options.height}"/></svg>`;
          const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
          const url = URL.createObjectURL(svgBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          return;
        }

        // Verify SVG is self-contained (no external image URLs)
        const svgText = await (blob as Blob).text();
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
