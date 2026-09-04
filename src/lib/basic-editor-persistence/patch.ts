import type { Profile } from "../../types/database.ts";

/**
 * These are the fields the current Basic Editor actually edits. Host identity
 * fields (`id`, `user_id`, `public_id`) and JSON are intentionally excluded.
 */
export const BASIC_EDITOR_OWNED_PROFILE_FIELDS = [
  "slug",
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
] as const satisfies readonly (keyof Profile)[];

export type BasicEditorOwnedProfileField = (typeof BASIC_EDITOR_OWNED_PROFILE_FIELDS)[number];
export type BasicEditorProfileColumnsV1 = Partial<Pick<Profile, BasicEditorOwnedProfileField>>;

/** Existing Basic-only keys in profiles.template_config. */
export const BASIC_EDITOR_TEMPLATE_CONFIG_KEYS = [
  "basic_link_presentations",
  "professional_badge",
] as const;

export interface BasicEditorTemplateConfigPatchV1 {
  basic_link_presentations?: Record<string, unknown>;
  professional_badge?: boolean;
}

export interface BasicEditorPatchV1 {
  readonly profile: BasicEditorProfileColumnsV1;
  readonly templateConfig: BasicEditorTemplateConfigPatchV1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Extract only Basic-owned JSON keys; canonical/premium keys are ignored. */
export function pickBasicEditorTemplateConfigPatch(
  value: unknown,
): BasicEditorTemplateConfigPatchV1 {
  if (!isRecord(value)) return {};

  const patch: BasicEditorTemplateConfigPatchV1 = {};
  if (typeof value["professional_badge"] === "boolean") {
    patch.professional_badge = value["professional_badge"];
  }
  if (isRecord(value["basic_link_presentations"])) {
    patch.basic_link_presentations = cloneJson(value["basic_link_presentations"]);
  }
  return patch;
}

/** Build a Basic patch without ever copying unknown profile or JSON fields. */
export function createBasicEditorPatch(updates: Partial<Profile>): BasicEditorPatchV1 {
  const profile = {} as BasicEditorProfileColumnsV1;
  for (const field of BASIC_EDITOR_OWNED_PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      const value = updates[field];
      if (value !== undefined) {
        profile[field] = value as never;
      }
    }
  }

  return {
    profile,
    templateConfig: pickBasicEditorTemplateConfigPatch(updates.template_config),
  };
}

export function hasBasicEditorTemplateConfigPatch(
  patch: BasicEditorTemplateConfigPatchV1,
): boolean {
  return Object.keys(patch).length > 0;
}

/**
 * Pure fallback/preview merge. The production persistence path uses the SQL
 * RPC so this same merge happens atomically against the latest JSONB value.
 */
export function mergeBasicEditorTemplateConfig(
  current: unknown,
  patch: BasicEditorTemplateConfigPatchV1,
): Record<string, unknown> {
  const next = isRecord(current) ? cloneJson(current) : {};
  for (const key of BASIC_EDITOR_TEMPLATE_CONFIG_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      const value = patch[key];
      if (value !== undefined) next[key] = cloneJson(value);
    }
  }
  return next;
}
