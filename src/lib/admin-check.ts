import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verificar si un usuario es administrador.
 * Fuente de verdad única: la tabla `admin_users`.
 * (El owner está sembrado como super_admin; ver migrations_legacy_prebaseline/
 * 20260819213000_create_admin_system.sql. Policy RLS con email hardcodeado en el
 * baseline 20260914000000:1446-1452 queda como deuda documentada, no se toca.)
 */
export async function isUserAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error checking admin status:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error in isUserAdmin:", error);
    return false;
  }
}
