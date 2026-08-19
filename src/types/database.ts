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
  published: boolean;
  created_at: string;
  updated_at: string;
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
