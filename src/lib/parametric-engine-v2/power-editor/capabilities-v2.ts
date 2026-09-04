/**
 * POWER EDITOR CAPABILITY REGISTRY (V2)
 *
 * Every entry here was VERIFIED against the FROZEN Power Editor contract
 * (src/premium-template-studio). A capability is `true` only when the
 * renderer actually implements it — never because the type system allows it.
 *
 * The Engine decides WHICH capabilities to use, WHEN and WHY.
 * This registry only declares the MAXIMUM available visual vocabulary.
 */

export const POWER_EDITOR_CAPABILITIES = {
  /* backgrounds — engine/styleEngine.ts#pageBackground */
  background_solid: true,
  background_linear_gradient: true,
  background_radial_gradient: true,
  background_image: true,
  background_image_overlay: true,
  background_pattern_dots: true,
  background_pattern_grid: true,
  background_pattern_rings: true,
  background_pattern_noise: true,
  background_layered: false, // single backgroundImage slot
  background_mesh: false, // mesh exists as TEXTURE, not as background gradient
  background_conic: false,
  background_vignette: false,

  /* textures — ThemeTexture + engine/styleEngine.ts#textureStyle */
  texture_none: true,
  texture_grain: true,
  texture_paper: true,
  texture_linen: true,
  texture_mesh: true,
  texture_frost: true,
  texture_opacity: true,
  texture_scale: true,
  texture_metal: false,

  /* decorative frames — BlockStyle.frame */
  frame_hairline: true,
  frame_double_border: true,
  frame_inset: true,
  frame_gradient: true,
  frame_luxury: true,
  frame_glow: true,
  decorative_corners: false,

  /* surfaces / cards — engine/styleEngine.ts#cardStyle */
  card_preset_minimal: true,
  card_preset_soft: true,
  card_preset_glass: true,
  card_preset_elevated: true,
  card_preset_flat: true,
  card_preset_luxury: true,
  card_radius: true,
  card_border_width: true,
  card_blur: true,
  card_opacity: true,
  card_padding: true,
  card_shadow_none: true,
  card_shadow_sm: true,
  card_shadow_md: true,
  card_shadow_lg: true,
  card_shadow_glow: true,
  card_shadow_soft: true,
  card_shadow_elevated: true,
  card_shadow_floating: true,

  /* buttons — engine/styleEngine.ts#buttonStyle */
  button_solid: true,
  button_outline: true,
  button_ghost: true,
  button_glass: true,
  button_gradient: true,
  button_soft: true,
  button_radius: true,
  button_height: true,
  button_font_weight: true,
  button_shadow: true,
  button_border_width: true,

  /* design-system tokens — TemplateTheme */
  theme_radii_tokens: true,
  theme_shadow_tokens: true,
  theme_border_tokens: true,
  theme_gradient_tokens: true,
  theme_surface_tokens: true,

  /* typography — ThemeTypography */
  typography_heading_font: true,
  typography_body_font: true,
  typography_heading_size: true,
  typography_body_size: true,
  typography_weights: true,
  typography_line_height: true,
  typography_letter_spacing: true,
  typography_scale_tokens: true, // ThemeTypography.scale
  typography_fluid_scale: false, // fixed px, no clamp()

  /* banner / avatar — components/canvas/ProfileHeader.tsx */
  banner_image: true,
  banner_height_desktop: true,
  banner_height_mobile: true,
  banner_overlay: true,
  banner_blur: true,
  banner_gradient: true,
  banner_focal_xy: true,
  banner_radius: true,
  avatar_size: true,
  avatar_radius: true,
  avatar_border_width: true,
  avatar_shadow: true,
  avatar_overlap: true,
  avatar_align: true,
  avatar_decorative_frame: false,

  /* layout — constants/layouts.ts + TemplateLayout */
  layout_centered: true,
  layout_editorial: true,
  layout_bento: true,
  layout_split: true,
  layout_compact: true,
  layout_full_width: true,
  layout_profile_card: true,
  layout_portfolio: true,
  layout_executive: true,
  layout_responsive_columns: true,
  layout_header_modes: true, // overlap | stacked | inline | hero
  layout_content_width: true,
  layout_align_items: true,

  /* blocks — engine/BlockRegistry.ts (37 registered types) */
  block_hero: true,
  /**
   * The frozen renderer ALWAYS composes <ProfileHeader> (an <h1> with the
   * profile name). A `hero` block therefore duplicates the identity unless
   * the host suppresses the header, so the Engine keeps it opt-in.
   */
  hero_replaces_profile_header: false,
  block_heading: true,
  block_text: true,
  block_links: true,
  block_featuredLink: true,
  block_buttonGroup: true,
  block_cta: true,
  block_social: true,
  block_video: true,
  block_image: true,
  block_gallery: true,
  block_mediaCard: true,
  block_portfolio: true,
  block_document: true,
  block_contact: true,
  block_qr: true,
  block_trust: true,
  block_divider: true,
  block_spacer: true,
  block_stats: true,
  block_services: true,
  block_testimonials: true,
  block_pricing: true,
  block_faq: true,
  block_timeline: true,
  block_featuredMedia: true,
  block_floatingActions: true,
  block_product: true,
  block_productGrid: true,
  block_booking: true,
  block_calendar: true,
  block_events: true,
  block_map: true,
  block_music: true,
  block_carousel: true,
  block_tabs: true,
  block_bottomNav: true,

  /* per-block overrides — BlockStyle / BlockLayout */
  block_style_override: true,
  block_layout_columns: true,
  block_span: true,
  block_col_row_span: true,
  block_responsive_visibility: true,
  block_responsive_overrides: true, // TemplateBlock.responsive per breakpoint
  block_constraints: true, // position / zIndex / min-max / aspectRatio
  block_overlap: true,
  block_offset: true,
  block_sticky: true,
  block_floating: true,
  block_min_height: true,
  block_overlay: true,

  /* motion — MotionConfig + BlockMotionOverride */
  animation_none: true,
  animation_fade: true,
  animation_slide: true,
  animation_scale: true,
  animation_soft_rise: true,
  motion_per_block: true,
  motion_presets: true, // minimal | soft | editorial | creator | none
  motion_entrance: true,
  motion_hover: true,
  motion_duration: true,
  motion_delay: true,
  motion_stagger: true,

  /* still not present in the renderer */
  texture_metal_plate: false,
  multi_stop_gradient: false,
  arbitrary_css: false,
} as const;

export type PowerEditorCapabilityKey = keyof typeof POWER_EDITOR_CAPABILITIES;
export type PowerEditorCapabilities = Record<PowerEditorCapabilityKey, boolean>;

/**
 * Overrides may only DISABLE a capability.
 * The frozen registry is the maximum allowed vocabulary: a runtime override
 * can never promote `false -> true` and make the Engine emit something the
 * frozen renderer cannot draw.
 */
export function resolvePowerEditorCapabilities(
  overrides?: Partial<PowerEditorCapabilities>,
): PowerEditorCapabilities {
  const resolved = { ...POWER_EDITOR_CAPABILITIES } as PowerEditorCapabilities;
  if (!overrides) return resolved;
  for (const key of Object.keys(resolved) as PowerEditorCapabilityKey[]) {
    const override = overrides[key];
    if (override === undefined) continue;
    resolved[key] = POWER_EDITOR_CAPABILITIES[key] === true && override === true;
  }
  return resolved;
}

export function supportsCapability(
  capabilities: PowerEditorCapabilities,
  key: PowerEditorCapabilityKey,
): boolean {
  return capabilities[key] === true;
}

/** Capabilities the renderer supports but PageRecipeV1 could never express. */
export const CAPABILITIES_UNLOCKED_BY_V2: PowerEditorCapabilityKey[] = [
  "background_image",
  "background_pattern_dots",
  "background_pattern_grid",
  "background_pattern_rings",
  "texture_grain",
  "texture_paper",
  "texture_linen",
  "texture_frost",
  "frame_hairline",
  "frame_luxury",
  "card_preset_glass",
  "card_preset_luxury",
  "card_blur",
  "card_opacity",
  "card_shadow_glow",
  "button_glass",
  "button_gradient",
  "button_ghost",
  "button_height",
  "button_font_weight",
  "banner_focal_xy",
  "banner_blur",
  "banner_overlay",
  "layout_bento",
  "layout_split",
  "layout_executive",
  "layout_portfolio",
  "block_hero",
  "block_gallery",
  "block_portfolio",
  "block_video",
  "block_trust",
  "block_qr",
  "block_contact",
  "block_document",
  "block_mediaCard",
  "block_featuredLink",
  "block_stats",
  "block_services",
  "block_testimonials",
  "block_pricing",
  "block_faq",
  "block_timeline",
  "block_featuredMedia",
  "block_floatingActions",
  "block_events",
  "block_productGrid",
  "block_music",
  "block_map",
  "motion_per_block",
  "motion_presets",
  "motion_entrance",
  "motion_hover",
];
