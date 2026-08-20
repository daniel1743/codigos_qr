/**
 * Sistema de permisos/entitlements para funcionalidades Premium
 *
 * IMPORTANTE: Esta es una interfaz estructural preparada para la futura
 * integración con sistema de suscripciones. Por ahora, todos los usuarios
 * son considerados Free por defecto.
 *
 * PENDIENTE:
 * - Integración con Stripe/sistema de pagos
 * - Verificación server-side via RLS
 * - Tabla de suscripciones en Supabase
 * - Admin panel para otorgar acceso Premium
 */

export type UserPlan = "free" | "premium";

export interface UserEntitlements {
  plan: UserPlan;
  canUsePremiumTemplates: boolean;
  canExportHighRes: boolean; // Futuro
  canUseAdvancedAnalytics: boolean; // Futuro
}

/**
 * Determina los permisos de un usuario
 *
 * @param userId - ID del usuario autenticado
 * @returns Objeto con permisos del usuario
 *
 * NOTA: Por ahora siempre retorna plan Free.
 * En el futuro, esta función consultará:
 * - Base de datos de suscripciones
 * - Admin overrides
 * - Promotional credits
 */
export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  // TODO: Consultar base de datos cuando exista tabla de suscripciones
  // const subscription = await getSubscription(userId);
  // const isPremium = subscription?.status === 'active';

  const plan: UserPlan = "free"; // Hardcoded por ahora
  const isPremium = false;

  return {
    plan,
    canUsePremiumTemplates: isPremium,
    canExportHighRes: isPremium,
    canUseAdvancedAnalytics: isPremium,
  };
}

/**
 * Verificación rápida de acceso Premium (client-side)
 *
 * ADVERTENCIA: Esta verificación es solo para UI.
 * NO es seguridad real. El backend debe validar antes de:
 * - Guardar configuración Premium
 * - Generar descargas de alta resolución
 * - Acceder a features exclusivos
 *
 * @param userId - ID del usuario (opcional por ahora)
 * @returns true si el usuario tiene acceso Premium
 */
export function canUsePremiumTemplates(userId?: string): boolean {
  // TODO: Implementar verificación real cuando exista backend
  // Por ahora siempre retorna false (todos son Free)
  return false;
}

/**
 * Verifica si un usuario puede aplicar y guardar una plantilla Premium
 *
 * Esta función debe ser llamada antes de:
 * - Aplicar una plantilla Premium permanentemente
 * - Guardar configuración Premium en el perfil
 * - Descargar QR con diseño Premium
 *
 * Preview temporal está permitido para todos.
 */
export function canApplyPremiumTemplate(userId?: string): boolean {
  return canUsePremiumTemplates(userId);
}

/**
 * Lista de emails con acceso Premium temporal (desarrollo)
 *
 * NOTA: Este array debe eliminarse cuando exista sistema de suscripciones real.
 * Es solo para testing durante desarrollo.
 */
const PREMIUM_DEV_EMAILS: string[] = [
  "falcondaniel37@gmail.com",
];

/**
 * Verificación temporal por email (solo desarrollo)
 *
 * @deprecated Usar cuando exista sistema de suscripciones real
 */
export function hasPremiumAccessByEmail(email: string): boolean {
  return PREMIUM_DEV_EMAILS.includes(email.toLowerCase());
}

export function getPremiumOverrideByEmail(email?: string | null): UserEntitlements | null {
  if (!email || !hasPremiumAccessByEmail(email)) return null;

  return {
    plan: "premium",
    canUsePremiumTemplates: true,
    canExportHighRes: true,
    canUseAdvancedAnalytics: true,
  };
}
