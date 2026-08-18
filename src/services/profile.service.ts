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
};
