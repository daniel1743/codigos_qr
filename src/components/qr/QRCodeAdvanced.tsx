import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import type { Options } from "qr-code-styling";
import type { QRAdvancedOptions } from "../../types/qr-advanced";
import { PREMIUM_EFFECTS, PREMIUM_KEYFRAMES } from "../../lib/premium-qr-presets";

interface QRCodeAdvancedProps {
  options: QRAdvancedOptions;
  className?: string;
  onRender?: (canvas: HTMLCanvasElement) => void;
}

const DEFAULT_LOGO_SIZE = 0.185;
const DEFAULT_LOGO_MARGIN = 6;
const WHITE_THRESHOLD = 246;

async function removeWhiteBackground(src: string): Promise<string> {
  if (src.startsWith("data:image/svg+xml") || src.endsWith(".svg")) {
    return src;
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        resolve(src);
        return;
      }

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
  return Math.min(requestedSize * 1.03, 0.22);
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

      // Convertir nuestras opciones al formato de qr-code-styling
      const stylingOptions: Options = {
        width: options.width,
        height: options.height,
        data: options.data,
        margin: options.margin ?? 4,
        qrOptions: {
          errorCorrectionLevel: options.qrOptions?.errorCorrectionLevel ?? "H",
        },
        imageOptions: image
          ? {
              hideBackgroundDots: options.imageOptions?.hideBackgroundDots ?? true,
              imageSize: getImageSize(options),
              margin: options.imageOptions?.margin ?? DEFAULT_LOGO_MARGIN,
              crossOrigin: options.imageOptions?.crossOrigin ?? "anonymous",
            }
          : undefined,
        dotsOptions: {
          type: options.dotsType ?? "square",
        },
        backgroundOptions: {
          color: options.backgroundColor ?? "#ffffff",
        },
        cornersSquareOptions: options.cornersSquareType
          ? {
              type: options.cornersSquareType,
            }
          : undefined,
        cornersDotOptions: options.cornersDotType
          ? {
              type: options.cornersDotType,
            }
          : undefined,
      };

      // Manejar color de dots (sólido o gradiente)
      if (typeof options.dotsColor === "string") {
        // Color sólido
        stylingOptions.dotsOptions.color = options.dotsColor;

        // Aplicar mismo color a corners si no están especificados
        if (stylingOptions.cornersSquareOptions) {
          stylingOptions.cornersSquareOptions.color = options.dotsColor;
        }
        if (stylingOptions.cornersDotOptions) {
          stylingOptions.cornersDotOptions.color = options.dotsColor;
        }
      } else if (options.dotsColor && typeof options.dotsColor === "object") {
        // Gradiente
        const gradient = options.dotsColor;
        stylingOptions.dotsOptions.gradient = {
          type: gradient.type,
          rotation: gradient.rotation ?? 0,
          colorStops: gradient.colorStops.map((stop) => ({
            offset: stop.offset,
            color: stop.color,
          })),
        };

        // Aplicar gradiente también a corners
        if (stylingOptions.cornersSquareOptions) {
          stylingOptions.cornersSquareOptions.gradient = stylingOptions.dotsOptions.gradient;
        }
        if (stylingOptions.cornersDotOptions) {
          stylingOptions.cornersDotOptions.gradient = stylingOptions.dotsOptions.gradient;
        }
      }

      // Agregar logo si existe
      if (image) {
        stylingOptions.image = image;
      }

      // Crear o actualizar QR
      if (!qrCode.current) {
        qrCode.current = new QRCodeStyling(stylingOptions);
        qrCode.current.append(ref.current);
      } else {
        qrCode.current.update(stylingOptions);
      }

      const canvas = ref.current.querySelector("canvas");

      // Aplicar efectos Premium
      if (canvas && options.effect && options.effect !== "none") {
        const effectStyle = PREMIUM_EFFECTS[options.effect as keyof typeof PREMIUM_EFFECTS];

        if (effectStyle) {
          canvas.style.filter = effectStyle.filter;

          if (effectStyle.animation) {
            canvas.style.animation = effectStyle.animation;
          }

          if (effectStyle.backdropFilter) {
            canvas.style.backdropFilter = effectStyle.backdropFilter;
          }

          // Para efectos básicos que necesitan color
          if ((options.effect === "neon" || options.effect === "glow") && typeof options.dotsColor === "string") {
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
    // Convertir opciones igual que en el componente
    const stylingOptions: Options = {
      width: options.width,
      height: options.height,
      data: options.data,
      margin: options.margin ?? 4,
      qrOptions: {
        errorCorrectionLevel: options.qrOptions?.errorCorrectionLevel ?? "H",
      },
      imageOptions: options.image
        ? {
            hideBackgroundDots: options.imageOptions?.hideBackgroundDots ?? true,
            imageSize: getImageSize(options),
            margin: options.imageOptions?.margin ?? DEFAULT_LOGO_MARGIN,
          }
        : undefined,
      dotsOptions: {
        type: options.dotsType ?? "square",
      },
      backgroundOptions: {
        color: options.backgroundColor ?? "#ffffff",
      },
      cornersSquareOptions: options.cornersSquareType
        ? {
            type: options.cornersSquareType,
          }
        : undefined,
      cornersDotOptions: options.cornersDotType
        ? {
            type: options.cornersDotType,
          }
        : undefined,
    };

    // Color/gradiente
    if (typeof options.dotsColor === "string") {
      stylingOptions.dotsOptions.color = options.dotsColor;
      if (stylingOptions.cornersSquareOptions) {
        stylingOptions.cornersSquareOptions.color = options.dotsColor;
      }
      if (stylingOptions.cornersDotOptions) {
        stylingOptions.cornersDotOptions.color = options.dotsColor;
      }
    } else if (options.dotsColor && typeof options.dotsColor === "object") {
      const gradient = options.dotsColor;
      stylingOptions.dotsOptions.gradient = {
        type: gradient.type,
        rotation: gradient.rotation ?? 0,
        colorStops: gradient.colorStops.map((stop) => ({
          offset: stop.offset,
          color: stop.color,
        })),
      };
      if (stylingOptions.cornersSquareOptions) {
        stylingOptions.cornersSquareOptions.gradient = stylingOptions.dotsOptions.gradient;
      }
      if (stylingOptions.cornersDotOptions) {
        stylingOptions.cornersDotOptions.gradient = stylingOptions.dotsOptions.gradient;
      }
    }

    if (options.image) {
      stylingOptions.image = await removeWhiteBackground(options.image);
    }

    const qr = new QRCodeStyling(stylingOptions);

    if (format === "png") {
      const blob = await qr.getRawData("png");
      if (blob) {
        const url = URL.createObjectURL(blob as Blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else {
      const blob = await qr.getRawData("svg");
      if (blob) {
        const url = URL.createObjectURL(blob as Blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  return { download };
}
