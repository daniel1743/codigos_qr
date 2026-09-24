import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveCanonicalMagicPageId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("pages")
    .select("id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export function buildCanonicalMagicEditorUrl(pageId: string): string {
  return `/pages/${pageId}/edit`;
}
