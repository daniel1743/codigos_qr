// 'square' is kept strictly for safe legacy handling, the UI normalizes it to 'rounded'
export type AvatarShape = "circle" | "rounded" | "none" | "square";
export type ButtonRadius = "none" | "rounded" | "full";
export type ButtonStyle = "solid" | "outline" | "soft" | "pill" | "minimal" | "line" | "card";

export interface Profile {
  id: string; // UUID
  user_id: string; // UUID
  slug: string;
  public_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  avatar_shape: AvatarShape;
  ring_enabled: boolean;
  ring_color: string;
  ring_thickness: "thin" | "medium";
  font_family: string;
  background_color: string;
  button_color: string;
  button_text_color: string;
  button_radius: ButtonRadius;
  button_style: ButtonStyle;
  title_color?: string | null;
  title_size?: string;
  title_weight?: string;
  title_align?: string;
  bio_color?: string | null;
  bio_size?: string;
  bio_weight?: string;
  bio_align?: string;
  button_text_size?: string;
  button_text_weight?: string;
  button_content_align?: string;
  button_icon_position?: string;
  qr_foreground_color?: string | null;
  qr_background_color?: string | null;
  qr_logo_url?: string | null;
  qr_logo_enabled?: boolean;
  qr_gradient?: {
    type: "linear" | "radial";
    colorStops: Array<{ offset: number; color: string }>;
    rotation?: number;
  } | null;
  qr_dots_type?: string | null;
  qr_corners_square_type?: string | null;
  qr_corners_dot_type?: string | null;
  qr_corners_square_color?: string | null;
  qr_corners_dot_color?: string | null;
  qr_corner_top_left_color?: string | null;
  qr_corner_top_right_color?: string | null;
  qr_corner_bottom_left_color?: string | null;
  qr_frame_style?: string | null;
  qr_effect?: string | null;
  qr_demo_logo_id?: string | null;
  footer_enabled?: boolean;
  footer_text?: string | null;
  scan_count: number;
  published: boolean;
  theme_layout?: string;
  theme_surface?: string;
  theme_spacing?: string;
  decor_shape?: string | null;
  decor_particles?: string | null;
  decor_smoke?: string | null;
  decor_shadow?: string | null;
  decor_intensity?: string | null;
  social_covers_enabled?: boolean;
  hero_link_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QRVisualVersion {
  id: string; // UUID
  profile_id: string; // UUID
  foreground_color: string;
  background_color: string;
  logo_url: string | null;
  logo_enabled: boolean;
  created_at: string;
}

export type PlatformType =
  | "instagram"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "github"
  | "website"
  | "whatsapp"
  | "email"
  | "other";

export interface ProfileLink {
  id: string; // UUID
  profile_id: string; // UUID
  platform: PlatformType | string;
  label: string;
  url: string;
  icon_key: string | null;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
