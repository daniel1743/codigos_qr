import { createServerClient } from "@supabase/ssr";
import { env } from "../env";

/**
 * Crea una nueva instancia de Supabase por cada petición al servidor.
 * Esta arquitectura asegura que no se compartan sesiones (cookies)
 * de manera global entre usuarios en un entorno SSR.
 */
export function getServerSupabaseClient() {
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        // En Fase 01 no usamos autenticación por cookies aún,
        // pero establecemos el contrato arquitectónico de SSR.
        return [];
      },
      setAll(cookiesToSet) {
        // Reservado para implementación de auth en siguientes fases.
      },
    },
  });
}
