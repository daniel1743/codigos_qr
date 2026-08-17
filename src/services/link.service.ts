import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileLink } from "../types/database";

export const linkService = {
  async getProfileLinks(supabase: SupabaseClient, profileId: string): Promise<ProfileLink[]> {
    const { data, error } = await supabase
      .from("profile_links")
      .select("*")
      .eq("profile_id", profileId)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createProfileLink(
    supabase: SupabaseClient,
    linkData: Partial<ProfileLink> & {
      profile_id: string;
      platform: string;
      label: string;
      url: string;
    },
  ): Promise<ProfileLink> {
    const { data, error } = await supabase.from("profile_links").insert(linkData).select().single();

    if (error) throw error;
    return data;
  },

  async updateProfileLink(
    supabase: SupabaseClient,
    linkId: string,
    updates: Partial<ProfileLink>,
  ): Promise<ProfileLink> {
    const { data, error } = await supabase
      .from("profile_links")
      .update(updates)
      .eq("id", linkId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProfileLink(supabase: SupabaseClient, linkId: string): Promise<void> {
    const { error } = await supabase.from("profile_links").delete().eq("id", linkId);

    if (error) throw error;
  },

  async reorderProfileLinks(
    supabase: SupabaseClient,
    updates: { id: string; sort_order: number }[],
  ): Promise<void> {
    // Supabase JS doesn't have a bulk update yet for RPC-less usage,
    // we can do Promise.all for MVP or use an RPC.
    // For MVP, we will use Promise.all
    const promises = updates.map((update) =>
      supabase.from("profile_links").update({ sort_order: update.sort_order }).eq("id", update.id),
    );

    const results = await Promise.all(promises);
    for (const result of results) {
      if (result.error) throw result.error;
    }
  },
};
