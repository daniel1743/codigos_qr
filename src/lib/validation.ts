/**
 * Normaliza y valida una URL.
 * Agrega https:// si se omitió el protocolo, y rechaza protocolos inseguros.
 */
export function normalizeUrl(url: string): string {
  if (!url) return "";
  let trimmed = url.trim();

  const lowerUrl = trimmed.toLowerCase();
  if (
    lowerUrl.startsWith("javascript:") ||
    lowerUrl.startsWith("data:") ||
    lowerUrl.startsWith("vbscript:")
  ) {
    throw new Error("Protocolo no permitido.");
  }

  // Si no empieza con http/https/mailto/tel, asumimos https
  if (
    !lowerUrl.match(/^https?:\/\//) &&
    !lowerUrl.startsWith("mailto:") &&
    !lowerUrl.startsWith("tel:")
  ) {
    trimmed = "https://" + trimmed;
  }

  return trimmed;
}

export function isValidUrl(url: string): boolean {
  try {
    const normalized = normalizeUrl(url);
    new URL(normalized); // Arrojará error si está mal formada
    return true;
  } catch (e) {
    return false;
  }
}
