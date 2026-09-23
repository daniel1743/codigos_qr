import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AppWindowIcon,
  AtSignIcon,
  CircleUserRoundIcon,
  ImageIcon,
  ImagesIcon,
  LayersIcon,
  LayoutPanelTopIcon,
  MousePointerClickIcon,
  SquareIcon,
  TypeIcon } from
'lucide-react';
import type { ElementKind } from '../../types/editor';

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
  swatch?: string;
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
  page: AppWindowIcon
};