export type TextAlign = "left" | "center" | "right";

export interface TextStyle {
  font: string;
  size: number;
  color: string;
  weight: number;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
}

export type ImageState = "ready" | "preparing" | "error" | "empty";

export type ImageOrigin = "reference" | "own";

export type ImageFocus = "center" | "top" | "bottom";

export type ImageCrop = "4/3" | "1/1" | "3/4";

export interface CtaConfig {
  text: string;
  link: string;
  color: string;
  variant: "solid" | "outline" | "ghost";
  align: TextAlign;
}

export interface CardChrome {
  background: string;
  border: string;
  radius: number;
}

export interface BadgeStyle {
  backgroundColor: string;
  textColor: string;
  font: string;
  size: number;
  radius: number;
}

export interface Category {
  id: string;
  label: string;
  style: BadgeStyle;
}

export interface ProductOverrides {
  title: boolean;
  description: boolean;
  price: boolean;
  cta: boolean;
  card: boolean;
}

export interface Product {
  id: string;
  image: string | null;
  imageState: ImageState;
  imageOrigin: ImageOrigin;
  imageFocus: ImageFocus;
  imageCrop: ImageCrop;
  categoryIds: string[];
  tags: string[];
  title: string;
  titleStyle: TextStyle;
  description: string;
  descriptionStyle: TextStyle;
  longDescription: string;
  price: string;
  priceStyle: TextStyle;
  cta: CtaConfig;
  card: CardChrome;
  footerNote: string;
  overrides: ProductOverrides;
}

export type TargetKind =
  | "card"
  | "title"
  | "description"
  | "price"
  | "image"
  | "cta"
  | "page"
  | "page-title"
  | "page-description"
  | "badge";

export interface Selection {
  cardId: string; // 'page' for page targets
  kind: TargetKind;
  subId?: string; // e.g. for specific badges (category id)
}

export interface PageHeader {
  title: string;
  titleStyle: TextStyle;
  description: string;
  descriptionStyle: TextStyle;
}

export interface PageBackground {
  color: string;
}

export interface ThemeTokens {
  pageBackground: string;
  cardBackground: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  cta: string;
  border: string;
  badge: string;
  hero: string;
}

export type HeroVariant = "none" | "simple" | "full-width-image" | "split" | "overlay" | "wave";

export const TARGET_LABEL: Record<TargetKind, string> = {
  card: "Tarjeta",
  title: "Título",
  description: "Descripción",
  price: "Precio",
  image: "Imagen",
  cta: "Botón",
  page: "Página",
  "page-title": "Título página",
  "page-description": "Desc. página",
  badge: "Etiqueta",
};

export const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Open Sans", value: '"Open Sans", sans-serif' },
  { label: "Lato", value: "Lato, sans-serif" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Oswald", value: "Oswald, sans-serif" },
  { label: "Source Sans Pro", value: '"Source Sans Pro", sans-serif' },
  { label: "Slabo 27px", value: '"Slabo 27px", serif' },
  { label: "Raleway", value: "Raleway, sans-serif" },
  { label: "PT Sans", value: '"PT Sans", sans-serif' },
  { label: "Merriweather", value: "Merriweather, serif" },
  { label: "Nunito", value: "Nunito, sans-serif" },
  { label: "Playfair Display", value: '"Playfair Display", Georgia, serif' },
  { label: "Marcellus", value: "Marcellus, Georgia, serif" },
  { label: "Lora", value: "Lora, serif" },
  { label: "DM Sans", value: '"DM Sans", Inter, sans-serif' },
  { label: "Work Sans", value: '"Work Sans", sans-serif' },
  { label: "Fira Sans", value: '"Fira Sans", sans-serif' },
  { label: "Quicksand", value: "Quicksand, sans-serif" },
  { label: "Karla", value: "Karla, sans-serif" },
  { label: "Rubik", value: "Rubik, sans-serif" },
  { label: "Inconsolata", value: "Inconsolata, monospace" },
  { label: "Space Grotesk", value: '"Space Grotesk", sans-serif' },
  { label: "Plus Jakarta Sans", value: '"Plus Jakarta Sans", sans-serif' },
  { label: "Manrope", value: "Manrope, sans-serif" },
  { label: "Outfit", value: "Outfit, sans-serif" },
  { label: "Syne", value: "Syne, sans-serif" },
  { label: "Fraunces", value: "Fraunces, serif" },
  { label: "Chivo", value: "Chivo, sans-serif" },
  { label: "Crimson Pro", value: '"Crimson Pro", serif' },
];

export const COLOR_OPTIONS = [
  "#17140F",
  "#4A443C",
  "#7A736A",
  "#1E4D44",
  "#8A5A24",
  "#B42318",
  "#2F6FED",
  "#FFFFFF",
  "#F5F3F0",
  "#E6E1DA",
];
