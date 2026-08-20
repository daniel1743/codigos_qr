/**
 * Descarga el canvas del código QR como una imagen PNG.
 * Espera que el elemento <canvas> del QR tenga el ID "qr-code-canvas".
 */
export function downloadQR(publicId: string, elementId = "qr-code-canvas", filename?: string) {
  const canvas = document.getElementById(elementId) as HTMLCanvasElement;

  if (!canvas) {
    console.error("El canvas del código QR no fue encontrado en el DOM.");
    return;
  }

  try {
    const pngUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = filename || `qr-${publicId}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  } catch (error) {
    console.error("Error al generar la descarga del QR:", error);
  }
}

export async function downloadSVG(publicId: string, elementId = "qr-code-svg", filename?: string) {
  const svgElement = document.getElementById(elementId);
  if (!svgElement) {
    console.error("El SVG del código QR no fue encontrado.");
    return;
  }

  try {
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    // Encuentra cualquier <image> y convierte su href a base64
    const images = svgElement.getElementsByTagName("image");
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img) continue;
      const href = img.getAttribute("href") || img.getAttribute("xlink:href");
      if (href && href.startsWith("http")) {
        try {
          const response = await fetch(href);

          // Validate response before processing
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result;
              if (typeof result === "string") {
                resolve(result);
              } else {
                reject(new Error("FileReader result is not a string"));
              }
            };
            reader.onerror = () => reject(new Error("FileReader failed"));
            reader.readAsDataURL(blob);
          });

          // Reemplaza la URL en el string SVG original
          svgString = svgString.replace(href, base64);
        } catch (e) {
          console.error("Failed to embed external image in SVG", e);
          throw new Error(
            `No se pudo incrustar el logo en el SVG: ${e instanceof Error ? e.message : "Error desconocido"}`,
          );
        }
      }
    }

    // Modified by Claude Code — QR-STUDIO-CLOSE-10B
    // Verify no external image URLs remain in critical attributes
    const externalUrlPattern = /(?:href|xlink:href)=["']https?:\/\/[^"']+["']/i;
    if (externalUrlPattern.test(svgString)) {
      throw new Error(
        "El SVG contiene referencias externas que no pudieron incrustarse. Descarga sin logo o intenta con otra imagen.",
      );
    }

    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = filename || `qr-${publicId}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error al descargar SVG:", error);
  }
}
