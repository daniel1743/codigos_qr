import type { LucideIcon } from 'lucide-react';

export type TemplateId = 'bio' | 'business' | 'portfolio';
export type Device = 'desktop' | 'mobile';
export type MobileWidth = 360 | 390 | 430;
export type EditorMode = 'edit' | 'preview';
export type SheetState = 'compact' | 'expanded';

export type ElementKind =
'text' |
'image' |
'hero' |
'avatar' |
'cta' |
'social' |
'card' |
'gallery' |
'section' |
'page';

export type BlockType =
'hero' |
'profile' |
'text' |
'links' |
'social' |
'image' |
'gallery' |
'video' |
'collection' |
'location';

export type TextAlign = 'left' | 'center' | 'right';
export type HeroVariant = 'simple' | 'centered' | 'split' | 'image';
export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'whatsapp' | 'email' | 'linkedin' | 'web' | 'phone';

export interface TextStyle {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: TextAlign;
  upper?: boolean;
  tracking?: 'normal' | 'wide';
}

export interface BlockRef {
  key: string;
  type: BlockType;
  hidden?: boolean;
}

export interface PageDoc {
  blocks: BlockRef[];
  texts: Record<string, string>;
  textStyles: Record<string, TextStyle>;
  props: Record<string, Record<string, string>>;
  removed: Record<string, boolean>;
}

export interface ElementInfo {
  id: string;
  kind: ElementKind;
  label: string;
  parentId?: string;
  blockKey?: string;
}

export interface SurfaceTone {
  id: string;
  label: string;
  color: string;
  fg: string;
  muted: string;
  surface: string;
  line: string;
}

export interface FontPair {
  id: string;
  label: string;
  display: string;
  body: string;
}

export interface Theme {
  accent: string;
  accentFg: string;
  radius: number;
  swatches: string[];
  tones: SurfaceTone[];
  pageTones: string[];
  fonts: FontPair[];
}

export interface ThemeTokens extends Theme {
  page: SurfaceTone;
  displayFont: string;
  bodyFont: string;
}

export type TourTarget = 'text' | 'hero' | 'avatar' | 'cta' | 'card' | 'gallery' | 'section';

export type TourStep =
'normal' |
TourTarget |
'add' |
'advanced' |
'sheet-compact' |
'sheet-expanded' |
'keyboard';

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  short: string;
  description: string;
  demonstrates: string[];
  slug: string;
  preview: string;
  fontsLabel: string;
  theme: Theme;
  initialBlocks: BlockRef[];
  tour: Record<TourTarget, string>;
}

export interface BlockKitItem {
  type: BlockType;
  label: string;
  description: string;
  icon: LucideIcon;
}