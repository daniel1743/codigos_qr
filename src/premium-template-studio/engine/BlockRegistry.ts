import type { ComponentType } from "react";
import type { BlockType, TemplateBlock } from "../types";
import {
  ContactBlock,
  DividerBlock,
  DocumentBlock,
  HeadingBlock,
  QRBlock,
  SpacerBlock,
  TextBlock,
  TrustBlock,
} from "../components/blocks/ContentBlocks";
import { HeroBlock } from "../components/blocks/HeroBlock";
import {
  ButtonGroupBlock,
  CTABlock,
  FeaturedLinkBlock,
  LinksBlock,
  SocialBlock,
} from "../components/blocks/ActionBlocks";
import {
  GalleryBlock,
  ImageBlock,
  MediaCardBlock,
  PortfolioBlock,
  VideoBlock,
} from "../components/blocks/MediaBlocks";

import {
  StatsBlock,
  ServicesBlock,
  TestimonialsBlock,
  PricingBlock,
  FAQBlock,
  TimelineBlock,
  FeaturedMediaBlock,
  FloatingActionsBlock,
} from "../components/blocks/PremiumBlocks";

import {
  ProductCardBlock,
  ProductGridBlock,
  BookingBlock,
  CalendarBlock,
  EventsBlock,
  MapBlock,
  MusicBlock,
  CarouselBlock,
  TabsBlock,
  BottomNavigationBlock,
} from "../components/blocks/PremiumBlocksII";

/**
 * BLOCK EXTENSION POINT
 * The renderer never branches on block type — it resolves the component here.
 * Registering a new block is a one-line change.
 */
export type BlockComponent = ComponentType<{ block: TemplateBlock }>;

export const BlockRegistry: Partial<Record<BlockType, BlockComponent>> = {
  hero: HeroBlock,
  heading: HeadingBlock,
  text: TextBlock,
  links: LinksBlock,
  featuredLink: FeaturedLinkBlock,
  buttonGroup: ButtonGroupBlock,
  cta: CTABlock,
  social: SocialBlock,
  video: VideoBlock,
  image: ImageBlock,
  gallery: GalleryBlock,
  mediaCard: MediaCardBlock,
  portfolio: PortfolioBlock,
  document: DocumentBlock,
  contact: ContactBlock,
  qr: QRBlock,
  trust: TrustBlock,
  divider: DividerBlock,
  spacer: SpacerBlock,
  stats: StatsBlock,
  services: ServicesBlock,
  testimonials: TestimonialsBlock,
  pricing: PricingBlock,
  faq: FAQBlock,
  timeline: TimelineBlock,
  featuredMedia: FeaturedMediaBlock,
  floatingActions: FloatingActionsBlock,
  product: ProductCardBlock,
  productGrid: ProductGridBlock,
  booking: BookingBlock,
  calendar: CalendarBlock,
  events: EventsBlock,
  map: MapBlock,
  music: MusicBlock,
  carousel: CarouselBlock,
  tabs: TabsBlock,
  bottomNav: BottomNavigationBlock,
};

export function getBlockComponent(type: BlockType): BlockComponent | undefined {
  return BlockRegistry[type];
}

export function registerBlock(type: BlockType, component: BlockComponent): void {
  BlockRegistry[type] = component;
}

export const REGISTERED_BLOCK_TYPES = Object.keys(BlockRegistry) as BlockType[];
