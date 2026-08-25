/**
 * Validaciones puras y reutilizables para el flujo de Documentos Seguros.
 * La carga admite formatos documentales deliberadamente limitados y con un tamaño controlado.
 */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function sanitizeDocumentName(name: string) {
  const normalized = name.trim().replace(/[^a-zA-Z0-9._() -]/g, "_");
  const fallback = normalized || "documento";
  return fallback.slice(0, 160);
}

export function isAcceptedDocumentType(mimeType: string) {
  return ACCEPTED_DOCUMENT_TYPES.has(mimeType);
}

export function decodeDocumentBase64(dataBase64: string, expectedBytes: number) {
  const base64 = dataBase64.includes(",") ? dataBase64.slice(dataBase64.indexOf(",") + 1) : dataBase64;
  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length || buffer.length !== expectedBytes) {
    throw new Error("El contenido del archivo no coincide con el tamaño declarado.");
  }

  return buffer;
}
