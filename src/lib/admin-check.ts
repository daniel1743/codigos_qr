import type { SupabaseClient } from "@supabase/supabase-js";

function isExpectedAdminAccessDenial(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  return (
    record["status"] === 401 ||
    record["code"] === "401" ||
    record["code"] === "42501" ||
    record["code"] === "PGRST301"
  );
}

/**
 * Verificar si un usuario es administrador
 */
export async function isUserAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (!isExpectedAdminAccessDenial(error)) {
        console.error("Error checking admin status:", error);
      }
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error in isUserAdmin:", error);
    return false;
  }
}

/**
 * Lista de emails admin hardcoded como fallback
 */
export const ADMIN_EMAILS = ["falcondaniel37@gmail.com", "admin@example.com"];

/**
 * Verificar si un email es admin (fallback)
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
