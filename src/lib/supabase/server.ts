import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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


// Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
// This helper must only be called from server functions. The secret is never VITE-prefixed.
export function getServiceRoleSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing on the server.");
  }

  return createClient(env.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
