/**
 * Carga determinista de imágenes para exportación QR
 * Evita setTimeout arbitrarios esperando señales reales del navegador
 */

export interface LoadImageOptions {
  crossOrigin?: "anonymous" | "use-credentials" | null;
  timeout?: number;
}

/**
 * Carga una imagen y espera hasta que esté completamente decodificada
 * @param src URL de la imagen
 * @param options Opciones de carga
 * @returns Promise que resuelve con HTMLImageElement listo para usar
 */
export async function loadImageDeterministic(
  src: string,
  options: LoadImageOptions = {},
): Promise<HTMLImageElement> {
  const { crossOrigin = "anonymous", timeout = 10000 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    let timeoutId: number | null = null;

    // Cleanup function
    const cleanup = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      img.onload = null;
      img.onerror = null;
    };

    // Timeout handler
    if (timeout > 0) {
      timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error(`Image load timeout after ${timeout}ms: ${src}`));
      }, timeout);
    }

    // Error handler
    img.onerror = (error) => {
      cleanup();
      reject(new Error(`Failed to load image: ${src}. ${error}`));
    };

    // Success handler
    img.onload = async () => {
      cleanup();

      // Use decode() if available for better determinism
      if (img.decode) {
        try {
          await img.decode();
          resolve(img);
        } catch (decodeError) {
          reject(new Error(`Failed to decode image: ${src}. ${decodeError}`));
        }
      } else {
        // Fallback: image is loaded but not necessarily decoded
        // Add small delay for older browsers
        setTimeout(() => resolve(img), 0);
      }
    };

    // Set crossOrigin BEFORE src to avoid CORS issues
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }

    // Trigger load
    img.src = src;

    // If image is already cached, onload might fire synchronously
    if (img.complete && img.naturalHeight !== 0) {
      cleanup();
      resolve(img);
    }
  });
}
