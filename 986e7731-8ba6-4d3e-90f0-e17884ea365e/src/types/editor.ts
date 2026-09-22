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

export interface Product {
  id: string;
  image: string | null;
  imageState: ImageState;
  imageOrigin: ImageOrigin;
  imageFocus: ImageFocus;
  imageCrop: ImageCrop;
  badge: string | null;
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
}

export type TargetKind = "card" | "title" | "description" | "price" | "image" | "cta";

export interface Selection {
  cardId: string;
  kind: TargetKind;
}

export const TARGET_LABEL: Record<TargetKind, string> = {
  card: "Tarjeta",
  title: "Título",
  description: "Descripción",
  price: "Precio",
  image: "Imagen",
  cta: "Botón",
};

export const FONT_OPTIONS = [
  { label: "Marcellus", value: "Marcellus, Georgia, serif" },
  { label: "Playfair Display", value: '"Playfair Display", Georgia, serif' },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "DM Sans", value: '"DM Sans", Inter, sans-serif' },
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
];
