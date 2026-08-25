/**
 * Pruebas unitarias de las reglas de archivos antes de que el contenido llegue a storage.
 */
import { describe, expect, it } from "vitest";
import { demoModeAvailable } from "./demoDocuments";
import { decodeDocumentBase64, isAcceptedDocumentType, sanitizeDocumentName } from "./documents";

describe("document validation", () => {
  it("preserva nombres seguros y sustituye caracteres no compatibles", () => {
    expect(sanitizeDocumentName("propuesta: agosto?.pdf")).toBe("propuesta_ agosto_.pdf");
  });

  it("acepta únicamente los formatos documentales declarados", () => {
    expect(isAcceptedDocumentType("application/pdf")).toBe(true);
    expect(isAcceptedDocumentType("image/png")).toBe(false);
  });

  it("detecta contenido cuyo tamaño no coincide con el metadato", () => {
    expect(() => decodeDocumentBase64("dGVzdA==", 3)).toThrow("no coincide");
  });

  it("limita el modo de demostración a entornos no productivos", () => {
    expect(demoModeAvailable(false)).toBe(true);
    expect(demoModeAvailable(true)).toBe(false);
  });
});
