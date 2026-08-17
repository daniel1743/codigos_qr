/**
 * Descarga el canvas del código QR como una imagen PNG.
 * Espera que el elemento <canvas> del QR tenga el ID "qr-code-canvas".
 */
export function downloadQR(slug: string) {
  const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;

  if (!canvas) {
    console.error("El canvas del código QR no fue encontrado en el DOM.");
    return;
  }

  try {
    // Convertir el canvas a URL de datos de tipo PNG
    const pngUrl = canvas.toDataURL("image/png");

    // Crear un enlace temporal para forzar la descarga
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `qr-${slug}.png`;

    // Anexar, hacer clic, y remover
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  } catch (error) {
    console.error("Error al generar la descarga del QR:", error);
  }
}
