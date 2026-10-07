import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AppWindowIcon,
  AtSignIcon,
  BadgeIcon,
  BriefcaseIcon,
  EuroIcon,
  RectangleHorizontalIcon,
  CircleUserRoundIcon,
  ImageIcon,
  ImagesIcon,
  LayersIcon,
  LayoutPanelTopIcon,
  MousePointerClickIcon,
  SeparatorHorizontalIcon,
  SquareIcon,
  StarIcon,
  TypeIcon,
} from "lucide-react";
import type { ElementKind } from "../../types/editor";

/**
 * One action definition drives both surfaces:
 * desktop renders it in the floating toolbar, mobile renders it as a tile in the bottom sheet.
 */
export interface EditorAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  panel?: ReactNode;
  inline?: ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
  swatch?: string | undefined;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export const kindIcons: Record<ElementKind, LucideIcon> = {
  text: TypeIcon,
  image: ImageIcon,
  hero: LayoutPanelTopIcon,
  avatar: CircleUserRoundIcon,
  cta: MousePointerClickIcon,
  social: AtSignIcon,
  card: SquareIcon,
  gallery: ImagesIcon,
  section: LayersIcon,
  page: AppWindowIcon,
  familyCard: RectangleHorizontalIcon,
  surface: SquareIcon,
  icon: SquareIcon,
  price: EuroIcon,
  badge: BadgeIcon,
  imageCard: ImagesIcon,
  review: StarIcon,
  // L2 añadió dos kinds sin icono, así que el Record quedaba incompleto.
  separator: SeparatorHorizontalIcon,
  service: BriefcaseIcon,
};
