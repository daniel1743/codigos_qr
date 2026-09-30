import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, PublishedProfileConfig } from "../types/database";
import {
  createBasicEditorPatch,
  hasBasicEditorTemplateConfigPatch,
  type BasicEditorTemplateConfigPatchV1,
} from "../lib/basic-editor-persistence";
import { generatePublicId, getInternalSlugFromPublicId } from "../lib/publicId";

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

const PROFILE_UPDATE_BLOCKED_COLUMNS = new Set([
  "id",
  "user_id",
  "public_id",
  "published_profile_config",
  "published_template_config",
  "published_revision",
  "published_at",
]);

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

function toWritableProfileUpdatePayload(updates: Partial<Profile>) {
  const payload = toWritableProfilePayload(updates);
  for (const key of PROFILE_UPDATE_BLOCKED_COLUMNS) {
    delete payload[key as WritableProfileColumn];
  }
  return payload;
}

export const profileService = {
  async getPublishedMagicPageByLegacyPublicId(
    supabase: SupabaseClient,
    legacyPublicId: string,
  ): Promise<{ page_public_id: string; page_slug: string | null } | null> {
    const { data, error } = await supabase.rpc("get_published_magic_page_by_legacy_public_id", {
      p_legacy_public_id: legacyPublicId,
    });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    const row = rows[0] as { page_public_id?: unknown; page_slug?: unknown } | undefined;
    if (!row || typeof row.page_public_id !== "string") return null;
    return {
      page_public_id: row.page_public_id,
      page_slug: typeof row.page_slug === "string" ? row.page_slug : null,
    };
  },

  async getProfileByUserId(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getProfilesByUserId(supabase: SupabaseClient, userId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async ensurePrimaryProfileForUser(
    supabase: SupabaseClient,
    input: {
      userId: string;
      email?: string | null;
      userMetadata?: Record<string, unknown> | null;
    },
  ): Promise<Profile> {
    const existing = await this.getProfileByUserId(supabase, input.userId);
    if (existing) return existing;

    const metadataName = input.userMetadata?.["full_name"] ?? input.userMetadata?.["name"];
    const emailLocalPart = input.email?.split("@")[0]?.trim();
    const displayName =
      (typeof metadataName === "string" && metadataName.trim()) || emailLocalPart || "Mi página";
    const publicId = generatePublicId();

    try {
      return await this.createProfile(supabase, {
        user_id: input.userId,
        public_id: publicId,
        slug: getInternalSlugFromPublicId(publicId),
        display_name: displayName,
        published: false,
      });
    } catch (creationError) {
      // A second tab/device may have won the insert race. Re-read before
      // surfacing the original error so bootstrap remains idempotent.
      const racedProfile = await this.getProfileByUserId(supabase, input.userId);
      if (racedProfile) return racedProfile;
      throw creationError;
    }
  },

  async getProfileByIdForUser(
    supabase: SupabaseClient,
    profileId: string,
    userId: string,
  ): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
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

    if (updates.template_config) {
      return this.patchBasicEditorTemplateConfig(supabase, profileId, patch.templateConfig);
    }

    if (!updatedProfile) {
      // In cases where only the basic layout is changed, if neither profile nor template_config changed,
      // fetch the existing profile to avoid throwing.
      return this.getProfileByIdForUser(
        supabase,
        profileId,
        updates.user_id || "",
      ) as Promise<Profile>;
    }

    return updatedProfile;
  },

  /** Atomically merges only the existing Basic-owned JSONB namespace. */
  async patchBasicEditorTemplateConfig(
    supabase: SupabaseClient,
    profileId: string,
    patch: BasicEditorTemplateConfigPatchV1,
  ): Promise<Profile> {
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
    const payload = toWritableProfileUpdatePayload(updates);
    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Promote the current owner state into the stable public presentation. */
  async publishProfileSnapshot(
    supabase: SupabaseClient,
    profileId: string,
  ): Promise<Profile & { published_profile_config: PublishedProfileConfig }> {
    const { data, error } = await supabase.rpc("publish_profile_snapshot", {
      p_profile_id: profileId,
    });
    if (error) throw error;
    if (!data?.published_profile_config) {
      throw new Error("La publicación no devolvió un snapshot público válido.");
    }
    return data as Profile & { published_profile_config: PublishedProfileConfig };
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
