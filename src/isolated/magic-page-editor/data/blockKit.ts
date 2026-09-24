import {
  AlignLeftIcon,
  AtSignIcon,
  BriefcaseIcon,
  CircleUserRoundIcon,
  FileTextIcon,
  ImageIcon,
  ImagesIcon,
  LayoutGridIcon,
  LayoutListIcon,
  LayoutPanelTopIcon,
  MapPinIcon,
  MousePointerClickIcon,
  PlayCircleIcon,
  ShoppingBagIcon,
  UtensilsIcon,
} from "lucide-react";
import { cardFamilies } from "./cardFamilies";
import type { BlockKitItem, BlockType } from "../types/editor";

const cardBlockKit: BlockKitItem[] = [
  {
    type: "catalog",
    label: cardFamilies.catalog.label,
    description: cardFamilies.catalog.subtitle,
    icon: LayoutListIcon,
  },
  {
    type: "cardPage",
    label: cardFamilies.page.label,
    description: cardFamilies.page.subtitle,
    icon: FileTextIcon,
  },
  {
    type: "cardPortfolio",
    label: cardFamilies.portfolio.label,
    description: cardFamilies.portfolio.subtitle,
    icon: BriefcaseIcon,
  },
  {
    type: "cardMenu",
    label: cardFamilies.menu.label,
    description: cardFamilies.menu.subtitle,
    icon: UtensilsIcon,
  },
  {
    type: "cardStore",
    label: cardFamilies.store.label,
    description: cardFamilies.store.subtitle,
    icon: ShoppingBagIcon,
  },
];

const visibleCardTypes = new Set<BlockType>(
  Object.values(cardFamilies)
    .filter((f) => f.visible)
    .map((f) => f.blockType),
);

export const blockKit: BlockKitItem[] = [
  {
    type: "hero",
    label: "Portada",
    description: "Imagen, título y presentación",
    icon: LayoutPanelTopIcon,
  },
  {
    type: "profile",
    label: "Perfil",
    description: "Avatar, nombre y descripción",
    icon: CircleUserRoundIcon,
  },
  { type: "text", label: "Texto", description: "Título y párrafo", icon: AlignLeftIcon },
  {
    type: "links",
    label: "Enlaces / CTA",
    description: "Botones y bloques de acción",
    icon: MousePointerClickIcon,
  },
  {
    type: "social",
    label: "Redes sociales",
    description: "Iconos a tus perfiles",
    icon: AtSignIcon,
  },
  { type: "image", label: "Imagen", description: "Una imagen destacada", icon: ImageIcon },
  { type: "gallery", label: "Galería", description: "Varias imágenes juntas", icon: ImagesIcon },
  { type: "video", label: "Vídeo", description: "YouTube, Vimeo o archivo", icon: PlayCircleIcon },
  {
    type: "collection",
    label: "Colección",
    description: "Servicios, productos, proyectos…",
    icon: LayoutGridIcon,
  },
  { type: "location", label: "Ubicación", description: "Mapa y dirección", icon: MapPinIcon },
  ...cardBlockKit.filter((b) => visibleCardTypes.has(b.type)),
];

/** Card families designed and wired, but hidden in production until their integration ships. */
export const preparedBlockKit: BlockKitItem[] = cardBlockKit.filter(
  (b) => !visibleCardTypes.has(b.type),
);

export const allCardBlockKit = cardBlockKit;

export const blockLabels: Record<BlockType, string> = {
  hero: "Portada",
  profile: "Perfil",
  text: "Texto",
  links: "Enlaces",
  social: "Redes",
  image: "Imagen",
  gallery: "Galería",
  video: "Vídeo",
  collection: "Colección",
  location: "Ubicación",
  catalog: "Catálogo",
  cardPage: "Página",
  cardPortfolio: "Portafolio",
  cardMenu: "Menú",
  cardStore: "Tienda",
};
