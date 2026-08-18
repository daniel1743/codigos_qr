import { env } from "./env";

/**
 * Generates the public URL for a given immutable profile public id.
 */
export function getPublicProfileUrl(publicId: string): string {
  // En el navegador, usar la URL real de la ventana automáticamente.
  // Esto previene que el QR apunte a localhost si la variable de entorno no se configuró bien en Vercel.
  let appUrl = env.appUrl;
  if (typeof window !== "undefined") {
    appUrl = window.location.origin;
  }

  // Ensure no trailing slash on appUrl and no leading slash on publicId
  const baseUrl = appUrl.replace(/\/$/, "");
  const cleanPublicId = publicId.replace(/^\//, "");

  return `${baseUrl}/p/${cleanPublicId}`;
}
