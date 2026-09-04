import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../types/database";
import {
  createBasicEditorPatch,
  hasBasicEditorTemplateConfigPatch,
  type BasicEditorTemplateConfigPatchV1,
} from "../lib/basic-editor-persistence";

// Modified by ChatGPT Work — PROFILE-SAVE-REALITY-FIX-01
const PROFILE_WRITABLE_COLUMNS = [
  "user_id",
  "slug",
  "public_id",
  "display_name",
  "profession",
  "bio",
  "avatar_url",
  "banner_url",
  "banner_fusion_strength",
  "avatar_shape",
  "ring_enabled",
  "ring_color",
  "ring_thickness",
  "font_family",
  "title_font_family",
  "bio_font_family",
  "background_color",
  "button_color",
  "button_text_color",
  "button_radius",
  "button_style",
  "button_border_thickness",
  "button_border_color",
  "title_color",
  "title_size",
  "title_weight",
  "title_align",
  "bio_color",
  "bio_size",
  "bio_weight",
  "bio_align",
  "button_text_size",
  "button_text_weight",
  "button_content_align",
  "button_icon_position",
  "qr_foreground_color",
  "qr_background_color",
  "qr_logo_url",
  "qr_logo_enabled",
  "qr_gradient",
  "qr_dots_type",
  "qr_corners_square_type",
  "qr_corners_dot_type",
  "qr_corners_square_color",
  "qr_corners_dot_color",
  "qr_corner_top_left_color",
  "qr_corner_top_right_color",
  "qr_corner_bottom_left_color",
  "qr_frame_style",
  "qr_effect",
  "qr_demo_logo_id",
  "footer_enabled",
  "footer_text",
  "published",
  "theme_layout",
  "theme_surface",
  "theme_spacing",
  "decor_shape",
  "decor_particles",
  "decor_smoke",
  "decor_shadow",
  "decor_intensity",
  "social_covers_enabled",
  "social_cover_style",
  "social_cover_avatar_enabled",
  "social_cover_height",
  "social_cover_width",
  "hero_link_id",
  "template_id",
  "template_version",
  "template_config",
] as const;

type WritableProfileColumn = (typeof PROFILE_WRITABLE_COLUMNS)[number];

function toWritableProfilePayload(updates: Partial<Profile>) {
  const payload: Partial<Record<WritableProfileColumn, unknown>> = {};
  for (const key of PROFILE_WRITABLE_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      const value = updates[key as keyof Profile];
      if (value !== undefined) {
        payload[key] = value;
      }
    }
  }
  return payload;
}

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
    const { data, error } = await supabase
      .from("profiles")
      .insert(toWritableProfilePayload(profileData))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Persist the current Basic Editor state without replacing unknown JSONB
   * fields owned by a future canonical editor.
   */
  async updateBasicEditorProfile(
    supabase: SupabaseClient,
    profileId: string,
    updates: Partial<Profile>,
  ): Promise<Profile> {
    const patch = createBasicEditorPatch(updates);
    let updatedProfile: Profile | null = null;

    if (Object.keys(patch.profile).length > 0) {
      const { data, error } = await supabase
        .from("profiles")
        .update(patch.profile)
        .eq("id", profileId)
        .select()
        .single();

      if (error) throw error;
      updatedProfile = data;
    }

    if (hasBasicEditorTemplateConfigPatch(patch.templateConfig)) {
      return this.patchBasicEditorTemplateConfig(supabase, profileId, patch.templateConfig);
    }

    if (!updatedProfile) {
      throw new Error("Basic Editor produced an empty persistence patch.");
    }

    return updatedProfile;
  },

  /** Atomically merges only the existing Basic-owned JSONB namespace. */
  async patchBasicEditorTemplateConfig(
    supabase: SupabaseClient,
    profileId: string,
    patch: BasicEditorTemplateConfigPatchV1,
  ): Promise<Profile> {
    if (!hasBasicEditorTemplateConfigPatch(patch)) {
      throw new Error("Basic Editor template config patch cannot be empty.");
    }

    const { data, error } = await supabase.rpc("patch_profile_basic_template_config", {
      p_profile_id: profileId,
      p_patch: patch,
    });

    if (error) throw error;
    if (!data) throw new Error("Basic Editor template config patch returned no profile.");
    return data as Profile;
  },

  async updateProfile(
    supabase: SupabaseClient,
    profileId: string,
    updates: Partial<Profile>,
  ): Promise<Profile> {
    const payload = toWritableProfilePayload(updates);
    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
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
