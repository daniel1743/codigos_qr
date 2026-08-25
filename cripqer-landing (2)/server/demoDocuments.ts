/**
 * El modo demostración sólo existe fuera de producción y usa un propietario técnico aislado.
 * Nunca otorga acceso a los documentos de usuarios autenticados.
 */
export const DEMO_DOCUMENT_OWNER_OPEN_ID = "cripqer-demo-documents";

export function demoModeAvailable(isProduction: boolean) {
  return !isProduction;
}
