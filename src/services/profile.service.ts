import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../types/database";

export const profileService = {
  async getProfileByUserId(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getPublicProfileByPublicId(
    supabase: SupabaseClient,
    publicId: string,
  ): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("public_id", publicId)
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getPublicProfileBySlug(supabase: SupabaseClient, slug: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createProfile(
    supabase: SupabaseClient,
    profileData: Partial<Profile> & {
      user_id: string;
      slug: string;
      public_id: string;
      display_name: string;
    },
  ): Promise<Profile> {
    const { data, error } = await supabase.from("profiles").insert(profileData).select().single();

    if (error) throw error;
    return data;
  },

  async updateProfile(
    supabase: SupabaseClient,
    profileId: string,
    updates: Partial<Profile>,
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async incrementScanCount(supabase: SupabaseClient, profileId: string): Promise<void> {
    const { error } = await supabase.rpc("increment_scan_count", { p_id: profileId });
    if (error) {
      console.error("Error incrementing scan count:", error);
    }
  },

  async getQRVisualVersions(supabase: SupabaseClient, profileId: string) {
    const { data, error } = await supabase
      .from("qr_visual_versions")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  },

  async saveQRVisualVersion(
    supabase: SupabaseClient,
    versionData: {
      profile_id: string;
      foreground_color: string;
      background_color: string;
      logo_url: string | null | undefined;
      logo_enabled: boolean;
    },
  ) {
    const { data, error } = await supabase
      .from("qr_visual_versions")
      .insert(versionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
