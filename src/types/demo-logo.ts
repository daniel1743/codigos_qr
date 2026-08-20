export type DemoLogoCategory = "business" | "food" | "beauty" | "tech" | "creative";
export type DemoLogoTier = "free" | "premium";

export interface DemoLogo {
  id: string;
  name: string;
  category: DemoLogoCategory;
  file_url: string;
  preview_url: string;
  tier: DemoLogoTier;
  created_at: string;
  updated_at: string;
}
