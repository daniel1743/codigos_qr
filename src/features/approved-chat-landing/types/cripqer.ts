export type TemplateId =
'warm_care' |
'dark_craft' |
'soft_beauty' |
'food_story' |
'professional_trust' |
'personal_brand' |
'product_spotlight' |
'minimal_premium' |
'bold_creative' |
'local_friendly' |
'editorial_luxury' |
'visual_portfolio';

/* ---------- Magic Editor contract vocabulary (closed) ---------- */

/** Registered hero variants used by the 12 families. */
export type HeroVariant =
'backgroundFade' |
'cinematic' |
'elegantOverlay' |
'fullBleed' |
'editorialCenter' |
'sideBleed' |
'splitHorizontal' |
'minimalPremium' |
'collage' |
'avatarBand' |
'magazine' |
'galleryFrame';

export type HeroHeight = 'S' | 'M' | 'L';
export type HeroOverlay = 'none' | 'soft' | 'medium' | 'intense';
export type HeroFusion = 'none' | 'fade' | 'halo' | 'organic' | 'dominant';

export interface HeroSpec {
  variant: HeroVariant;
  height: HeroHeight;
  overlay: HeroOverlay;
  fusion: HeroFusion;
}

/** Multi-block page families only. catalog / gallery page families are single-purpose and not used here. */
export type PageFamily = 'business' | 'bio' | 'portfolio';

export type BlockType =
'services' |
'reviews' |
'whatsapp' |
'imageCards' |
'social' |
'gallery' |
'location' |
'profile' |
'links' |
'cta' |
'text' |
'contact' |
'video' |
'separator';

export type ServicesLayout = 'icons' | 'rule' | 'cards' | 'list';
export type GalleryLayout = 'row' | 'mosaic' | 'carousel' | 'editorial' | 'stacked';
export type ImageCardsLayout = 'grid' | 'row';
export type ReviewsLayout = 'cards' | 'quote';
export type SocialLayout = 'pills' | 'solid';
export type SeparatorStyle = 'minimal' | 'editorial' | 'luxury' | 'double' | 'dot-center';

export interface Section {
  block: BlockType;
  layout?: ServicesLayout | GalleryLayout | ImageCardsLayout | ReviewsLayout | SocialLayout | SeparatorStyle;
  title?: string;
}

export type CardStyle = 'soft' | 'line' | 'sharp' | 'flat';

export interface TemplatePalette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
}

export interface TemplateFont {
  heading: string;
  body: string;
  headingWeight: number;
  uppercase?: boolean;
  tracking?: 'tight' | 'normal' | 'wide';
  script?: string;
  label: string;
}

export type IconKey =
'paw' |
'scissors' |
'bath' |
'bag' |
'stethoscope' |
'sparkles' |
'utensils' |
'pizza' |
'wine' |
'cake' |
'coffee' |
'briefcase' |
'scale' |
'file' |
'users' |
'heart' |
'gem' |
'flower' |
'camera' |
'brush' |
'palette' |
'leaf' |
'package' |
'building' |
'star';

export interface PageContent {
  name: string;
  role: string;
  eyebrow: string;
  tagline: string;
  about: string;
  cta: string;
  services: {title: string;detail: string;price: string;icon: IconKey;}[];
  reviews: {quote: string;author: string;}[];
  links: string[];
  imageCards: {title: string;detail: string;image: string;}[];
  location: {address: string;hours: string;};
  social: string[];
  videoTitle: string;
  images: {hero: string;portrait: string;gallery: string[];};
  /** Optional business-specific title for the services block (e.g. "Propiedades destacadas"). */
  servicesTitle?: string;
}

export interface ContentPack {
  id: string;
  label: string;
  content: PageContent;
  /**
   * Content-only refinements when this business is shown inside a specific family.
   * Never changes the family's visual grammar — only text/photos/CTA.
   */
  familyOverrides?: Partial<Record<TemplateId, Partial<PageContent>>>;
}

export interface TemplateFamily {
  id: TemplateId;
  name: string;
  demo: string;
  personality: string;
  pageFamily: PageFamily;
  hero: HeroSpec;
  heroLabel: string;
  sections: Section[];
  palette: TemplatePalette;
  font: TemplateFont;
  cardStyle: CardStyle;
  mood: 'light' | 'dark';
  packId: string;
  tags: string[];
  descriptors: string[];
  related: TemplateId[];
}

/* ---------- Conversation ---------- */

export type ChannelId = 'whatsapp' | 'instagram' | 'phone' | 'email';

export interface BusinessContext {
  businessIdentity: {
    name: string | null;
    type: string | null;
    description: string | null;
  };
  primaryGoal: string | null;
  primaryChannel: ChannelId | null;
  template: {
    selectedTemplateId: TemplateId | null;
    templateFamily: string | null;
    heroVariant: HeroVariant | null;
    visualPersonality: string | null;
  };
  session: {
    initialTemplates: TemplateId[];
    lastShownTemplates: TemplateId[];
  };
}

export interface ContextPatch {
  name?: string;
  type?: string;
  description?: string;
  goal?: string;
  channel?: ChannelId;
}

export interface ChatOption {
  label: string;
  message: string;
}

export type Attachment =
{kind: 'templates';ids: TemplateId[];scope: 'initial' | 'recommended' | 'similar';} |
{kind: 'options';options: ChatOption[];} |
{kind: 'ready';} |
{kind: 'selected';id: TemplateId;};

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  attachment?: Attachment | undefined;
}

export type AgentAction =
{type: 'SHOW_TEMPLATES';scope: 'INITIAL';} |
{type: 'RECOMMEND_TEMPLATES';ids: TemplateId[];similarTo?: TemplateId;reasons?: Partial<Record<TemplateId, string>>;} |
{type: 'PREVIEW_TEMPLATE';id: TemplateId;} |
{type: 'SELECT_TEMPLATE';id: TemplateId;} |
{type: 'SHOW_OPTIONS';options: ChatOption[];} |
{type: 'SHOW_READY';} |
{type: 'UPDATE_BUSINESS_CONTEXT';patch: ContextPatch;} |
{type: 'OPEN_TEMPLATE_DRAWER';} |
{type: 'CREATE_PAGE';};

export interface AgentResponse {
  text: string;
  actions: AgentAction[];
}

export type Stage = 'discover' | 'converse' | 'generating' | 'editor';
export type StartAt = 'discover' | 'converse' | 'editor';