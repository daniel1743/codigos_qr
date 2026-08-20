import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import type { QRAdvancedOptions } from "../../types/qr-advanced";

interface QRCodeAdvancedProps {
  options: QRAdvancedOptions;
  className?: string;
  onRender?: (canvas: HTMLCanvasElement) => void;
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

    // Convertir nuestras opciones al formato de qr-code-styling
    const stylingOptions: any = {
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
            imageSize: options.imageOptions?.imageSize ?? 0.4,
            margin: options.imageOptions?.margin ?? 8,
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
    if (options.image) {
      stylingOptions.image = options.image;
    }

    // Crear o actualizar QR
    if (!qrCode.current) {
      qrCode.current = new QRCodeStyling(stylingOptions);
      qrCode.current.append(ref.current);
    } else {
      qrCode.current.update(stylingOptions);
    }

    // Aplicar efecto si existe
    if (options.effect && options.effect !== "none" && ref.current) {
      const canvas = ref.current.querySelector("canvas");
      if (canvas) {
        if (options.effect === "neon" || options.effect === "glow") {
          canvas.style.filter = "drop-shadow(0 0 8px currentColor) brightness(1.1)";
          canvas.style.color = typeof options.dotsColor === "string" ? options.dotsColor : "#000";
        }

        if (onRender) {
          onRender(canvas);
        }
      }
    }
  }, [options, onRender]);

  return <div ref={ref} className={className} />;
}

/**
 * Hook para descargar QR avanzado
 */
export function useQRAdvancedDownload() {
  const download = async (
    options: QRAdvancedOptions,
    filename: string,
    format: "png" | "svg" = "png"
  ) => {
    // Convertir opciones igual que en el componente
    const stylingOptions: any = {
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
            imageSize: options.imageOptions?.imageSize ?? 0.4,
            margin: options.imageOptions?.margin ?? 8,
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
      stylingOptions.image = options.image;
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
