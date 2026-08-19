import type { Profile } from "../../types/database";

export interface TemplateStyle {
  font_family: string;
  background_color: string;
  button_color: string;
  button_text_color: string;
  button_radius: Profile["button_radius"];
  button_style: Profile["button_style"];
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  style: TemplateStyle;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Limpio y universal.",
    style: {
      font_family: "Inter",
      background_color: "#FFFFFF",
      button_color: "#111111",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "solid",
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Elegante y sofisticado.",
    style: {
      font_family: "Playfair Display",
      background_color: "#F3EEE6",
      button_color: "#181818",
      button_text_color: "#181818",
      button_radius: "none",
      button_style: "line",
    },
  },
  {
    id: "beauty",
    name: "Beauty",
    description: "Suave, moderno y delicado.",
    style: {
      font_family: "DM Sans",
      background_color: "#F8EFEC",
      button_color: "#5C4138",
      button_text_color: "#5C4138",
      button_radius: "full",
      button_style: "soft",
    },
  },
  {
    id: "creator",
    name: "Creator",
    description: "Digital y directo.",
    style: {
      font_family: "Manrope",
      background_color: "#F7F7F7",
      button_color: "#111111",
      button_text_color: "#FFFFFF",
      button_radius: "full",
      button_style: "pill",
    },
  },
  {
    id: "music",
    name: "Music",
    description: "Oscuro y expresivo.",
    style: {
      font_family: "Montserrat",
      background_color: "#101010",
      button_color: "#FFFFFF",
      button_text_color: "#111111",
      button_radius: "rounded",
      button_style: "solid",
    },
  },
  {
    id: "business",
    name: "Business",
    description: "Corporativo sin sentirse aburrido.",
    style: {
      font_family: "Inter",
      background_color: "#F6F8FA",
      button_color: "#172033",
      button_text_color: "#FFFFFF",
      button_radius: "rounded",
      button_style: "card",
    },
  },
  {
    id: "photography",
    name: "Photography",
    description: "Editorial y visual.",
    style: {
      font_family: "Cormorant Garamond",
      background_color: "#ECE9E2",
      button_color: "#151515",
      button_text_color: "#151515",
      button_radius: "none",
      button_style: "minimal",
    },
  },
  {
    id: "warm",
    name: "Warm",
    description: "Cálido y artesanal.",
    style: {
      font_family: "Lora",
      background_color: "#EFE5D6",
      button_color: "#493C32",
      button_text_color: "#493C32",
      button_radius: "rounded",
      button_style: "soft",
    },
  },
  {
    id: "dark",
    name: "Dark",
    description: "Sobrio y premium.",
    style: {
      font_family: "Manrope",
      background_color: "#111111",
      button_color: "#262626",
      button_text_color: "#FFFFFF",
      button_radius: "full",
      button_style: "card",
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Tecnología y servicios.",
    style: {
      font_family: "Poppins",
      background_color: "#EEF4FF",
      button_color: "#2563EB",
      button_text_color: "#FFFFFF",
      button_radius: "full",
      button_style: "solid",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Vibrante y digital.",
    style: {
      font_family: "Manrope",
      background_color: "linear-gradient(135deg, #2563EB, #06B6D4)",
      button_color: "#FFFFFF",
      button_text_color: "#164E63",
      button_radius: "full",
      button_style: "pill",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Cálido e inspirador.",
    style: {
      font_family: "DM Sans",
      background_color: "linear-gradient(135deg, #FB7185, #FDBA74)",
      button_color: "#7C2D12",
      button_text_color: "#7C2D12",
      button_radius: "full",
      button_style: "soft",
    },
  },
];
