/*
 * Phase 7 - MagicPageDocumentV1 generation adapter.
 *
 * BusinessContext + selected conversational family -> MagicPageDocumentV1
 *
 * The Magic Editor is the only source of truth. Every prop key written here is
 * read by the isolated editor renderer, and every value comes from a vocabulary
 * the editor itself declares (HeroVariant / HeroHeight / HeroOverlay /
 * HeroFusion / SeparatorStyle / RowTreatment / SocialPresentation). Nothing is
 * invented: where a conversational layout has no verified engine equivalent the
 * prop is omitted and the engine default stands. No Power Editor contract
 * (parametric-engine-v2 / premium-template-studio / canonical-page) is used and
 * no Magic Editor / save / publish file is modified.
 */
import type { BlockRef, BlockType, HeroVariant, TextStyle } from '../../../isolated/magic-page-editor/types/editor';
import {
  MAGIC_DOCUMENT_TYPE,
  MAGIC_DOCUMENT_VERSION,
  validateMagicPageDocumentV1,
  type MagicPageDocumentV1 } from
'../../magic-page-editor-production/magic-document';
import {
  BUSINESS_CONTEXT_ORIGIN,
  CONTENT_ORIGIN_KEY } from
'../../../isolated/magic-page-editor/utils/contentOrigin';
import { serviceFieldId } from '../../../isolated/magic-page-editor/utils/servicesOps';
import { IMAGE_CARDS_MAX, imageCardId } from '../../../isolated/magic-page-editor/utils/imageCardOps';
import { BUTTON_GROUP_INITIALIZED, BUTTON_GROUP_INITIALIZED_VALUE, BUTTON_GROUP_ORDER } from '../../../isolated/magic-page-editor/utils/buttonGroup';
import { MAGIC_VIDEO_DEMO_OWNER, MAGIC_VIDEO_DEMO_URL } from '../../../isolated/magic-page-editor/utils/video';
import { contentForPack, getBusinessType, getTemplate, resolveContent } from '../utils/templates';
import type { AssistantResponse } from '../assistant/contracts';
import type { BusinessContext, PageContent, Section, TemplateFamily, TemplateId } from '../types/cripqer';

/* ------------------------------------------------------------------ */
/* Visual family -> engine vocabulary                                  */
/* ------------------------------------------------------------------ */

/**
 * Display face -> engine font-pair id. The ids come from the isolated editor
 * (data/fontPairs.ts, sharedFontPairs) plus each template own three pairs.
 * data/fontPairs.ts states these shared ids exist precisely for the 12 Magic
 * Patterns families. Cormorant Garamond is editorial in bio/business and
 * garamond in portfolio, because that is the id each template declares.
 */
const ENGINE_FONT_BY_HEADING: { face: string; id: string }[] = [
  { face: 'Playfair Display', id: 'playfair' },
  { face: 'Montserrat', id: 'montserrat' },
  { face: 'DM Serif Display', id: 'dm-serif' },
  { face: 'Great Vibes', id: 'great-vibes' },
  { face: 'Cormorant Garamond', id: 'editorial' },
  { face: 'Inter', id: 'inter-sans' },
];

export function engineFontId(family: TemplateFamily): string {
  for (const entry of ENGINE_FONT_BY_HEADING) {
    if (family.font.heading.indexOf(entry.face) !== -1) {
      if (entry.id === 'editorial' && family.pageFamily === 'portfolio') return 'garamond';
      return entry.id;
    }
  }
  return 'inter-sans';
}

/** Conversational GalleryLayout -> GalleryGrid own values. */
const GALLERY_LAYOUT: Record<string, string> = {
  row: 'fila',
  mosaic: 'mosaico',
  carousel: 'carrusel',
  editorial: 'masonry', // the target editorial layout is the engine masonry columns
  stacked: 'stacked',
};

/** Conversational ServicesLayout -> ServicesBlock rowTreatment. */
const SERVICES_TREATMENT: Record<string, string> = {
  cards: 'surface',
  list: 'surface',
  rule: 'rule',
};

/** Conversational SocialLayout -> SocialPresentation. */
const SOCIAL_PRESENTATION: Record<string, string> = {
  pills: 'pills',
};

/** Conversational SeparatorStyle is already the engine own SeparatorStyle. */
const SEPARATOR_STYLES = ['minimal', 'editorial', 'luxury', 'double', 'dot-center'];

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

/**
 * Deterministic block ids. The first block of a type keeps the short id
 * (hero), which is the engine own convention: blockPrefix() returns an empty
 * prefix while block.key === block.type, so native blocks keep the short text
 * ids (hero.title) and only duplicated/added blocks get a prefix.
 */
function nextBlockKey(type: BlockType, used: Record<string, number>): string {
  const seen = used[type] ?? 0;
  used[type] = seen + 1;
  return seen === 0 ? type : type + '-' + (seen + 1);
}

/** hero first, then the family sections, in their authored order. */
export function buildMagicBlocks(family: TemplateFamily): BlockRef[] {
  const hero: BlockRef = { key: 'hero', type: 'hero' };
  return [hero, ...sectionEntries(family).map(({ key, section }) => ({ key, type: section.block }))];
}

/**
 * The family's sections paired with the block key each one is given.
 *
 * `buildMagicBlocks`, `buildMagicBlockProps` and `buildMagicTexts` all have to
 * agree on the key of every section: a prop or a text written under one key and
 * read under another is silently unread, and the failure looks like "the block
 * is empty" rather than like a bug. The walk that assigns the keys therefore
 * lives here once, and the hero's slot is consumed first because the hero is
 * always the first block and always keeps the short key.
 */
function sectionEntries(family: TemplateFamily): { key: string; section: Section }[] {
  const used: Record<string, number> = {};
  nextBlockKey('hero', used);
  return family.sections.map((section) => ({ key: nextBlockKey(section.block, used), section }));
}

/**
 * The service rows a generated page declares for one services section.
 *
 * The pack's own list (`content.services`) is the same list the approved preview
 * drew for this family, so it is what the document carries — never another
 * business's. A row with no title is not a service the business declared, so it
 * is dropped rather than published as a blank line, and a pack that declares no
 * service leaves the block's list empty instead of filling it with a sample.
 */
function declaredServices(content: PageContent): PageContent['services'] {
  return content.services.filter((service) => service.title.trim() !== '');
}

/**
 * The image cards a generated page declares for one image-cards section.
 *
 * The pack's own list (`content.imageCards`) is the same imagery the approved
 * preview drew for this family — a template resource of the family's own trade,
 * never another trade's photo and never a photograph of the owner. Each card is
 * written in the exact shape `imageCardOps` persists: the slot list in
 * `block:<key>.items` and the picture in `<key>/item.<slot>.src`, which is where
 * `ImageCardsBlock` reads it. A card with no picture is dropped rather than
 * published as an empty frame, and a pack that declares none leaves the list
 * empty: that is the block's defined empty state, and the editor's own
 * cross-trade placeholder is never reached.
 */
function declaredImageCards(content: PageContent): PageContent['imageCards'] {
  return content.imageCards.slice(0, IMAGE_CARDS_MAX).filter((card) => card.image.trim() !== '');
}

/**
 * Mirrors the engine own blockPrefix (utils/styles.ts): a native block
 * whose key equals its type keeps the short id, so its text and prop ids
 * stay unprefixed.
 */
function blockPrefixOf(key: string, type: string): string {
  return key === type ? '' : key + '/';
}

/**
 * The scope each renderer actually reads its props from.
 *
 * HeroFrame, ServicesBlock, SeparatorBlock and EditableSocial read
 * block:KEY; GalleryGrid reads the element id the template hands it, which
 * is prefix + gallery. A layout written to the wrong scope is silently
 * unread, so the scope is chosen per block instead of assumed.
 */
function blockPropScope(key: string, type: string): string {
  if (type === 'gallery') return blockPrefixOf(key, type) + 'gallery';
  if (type === 'video') return blockPrefixOf(key, type) + 'video';
  return 'block:' + key;
}

/**
 * Block-scoped props. Only keys the renderer actually reads are written, and
 * only when the conversational value has an exact engine equivalent; otherwise
 * the prop is left out and the engine default applies.
 */
export function buildMagicBlockProps(
  family: TemplateFamily,
  context: BusinessContext,
): Record<string, Record<string, string>> {
  /**
   * Microfase 3A · the media the hero draws.
   *
   * The engine's media channel is `props[id].src` — `HeroFrame` reads
   * `p['src'] ?? media` and `EditableAvatar` reads `p['src'] ?? src` — so a
   * document that declares its own photo is drawn with it and the template's
   * own sample is only the fallback. Without this the generated page showed the
   * `business` template's clinic photo and portrait, which are the editor's
   * demo, not this business's imagery.
   *
   * The asset is the family's own (`data/contentPacks.ts`), resolved through
   * `resolveContent` exactly as the approved preview resolves it — the same
   * photo the visitor was shown when the family was chosen. Nothing is invented:
   * the Business Context declares no media of its own, so the family's declared
   * imagery stands in until the owner replaces it in the editor.
   */
  const content = resolveContent(family, context);
  const heroProps: Record<string, string> = {
    variant: family.hero.variant,
    height: family.hero.height,
    overlay: family.hero.overlay,
    fusion: family.hero.fusion,
    src: content.images.hero,
  };
  // Microfase 2A · composition alignment. Written only for the variants whose
  // composition is centered, so the other eleven families keep emitting exactly
  // the four keys they emitted before and their documents do not move. The key
  // is omitted, never written as 'left': an absent key is what lets documents
  // generated before this change keep the engine's own default.
  if (CENTERED_HERO_VARIANTS.indexOf(family.hero.variant) !== -1) heroProps['contentAlign'] = 'center';
  // The hero is always the first block, so it always keeps the short key.
  const props: Record<string, Record<string, string>> = { 'block:hero': heroProps };
  sectionEntries(family).forEach(({ key, section }) => {
    const layout = section.layout;
    const values: Record<string, string> = {};
    if (section.block === 'gallery') {
      if (layout && GALLERY_LAYOUT[layout]) values['layout'] = GALLERY_LAYOUT[layout];
      /**
       * Microfase 3B · the photos this page's gallery draws.
       *
       * `GalleryGrid` reads `props[id].items` as a pipe-separated list and, when
       * the key is absent, falls back to the array its template hands it — which
       * for a business page is the `business` template's clinic results. The
       * pack's own gallery is the imagery the approved preview showed for this
       * family, so the document declares it and the template's array is never
       * reached. The key is left out — never written as an empty list — only
       * when the pack declares no photo at all; the renderer's own empty state
       * is then what a generated page draws.
       */
      const gallery = content.images.gallery.filter((src) => src !== '');
      if (gallery.length > 0) values['items'] = gallery.join('|');
    }
    if (section.block === 'video') {
      values['href'] = MAGIC_VIDEO_DEMO_URL;
      values['demo'] = 'true';
      values['demoOwner'] = MAGIC_VIDEO_DEMO_OWNER;
    }
    if (section.block === 'services') {
      if (layout && SERVICES_TREATMENT[layout]) values['rowTreatment'] = SERVICES_TREATMENT[layout];
      /**
       * Microfase 3B · the rows this block lists.
       *
       * `servicesOrder` reads `props['block:<key>'].items` as the comma-separated
       * slot list and, when the key is absent, falls back to the editor's own
       * three demo slots — whose rows carry the editor's generic sample. A
       * generated page declares its rows, so the key is always written, even
       * when the pack declares no service: the empty list is the block's empty
       * state, and the sample is never reached. The slots are plain indices, the
       * same shape `addService` and `duplicateService` already append to.
       */
      values['items'] = declaredServices(content).map((_, index) => String(index)).join(',');
    }
    if (section.block === 'imageCards') {
      /**
       * Microfase 4C-1 · the pictures this block draws.
       *
       * `imageCardsOrder` reads `props['block:<key>'].items` as the slot list
       * and, when the key is absent, falls back to two default slots whose cards
       * draw the editor's placeholder photos — four pictures from four unrelated
       * trades. A generated page declares its own list and its own pictures, so
       * neither is ever reached. The pictures travel in the per-card scope the
       * block reads (`<key>/item.<slot>.src`), so they survive serialize/hydrate
       * and the author replaces them from the card panel like any other image.
       */
      const cards = declaredImageCards(content);
      values['items'] = cards.map((_, index) => String(index)).join(',');
      cards.forEach((card, index) => {
        props[imageCardId(key, String(index))] = { src: card.image };
      });
    }
    if (section.block === 'links') {
      /**
       * Microfase 4C-1 · a generated page declares its links as canonical and
       * empty.
       *
       * `readButtonGroup` falls back to the template's seed collection when the
       * order is empty and the group was never materialised — for a bio page
       * those seeds are the demo author's own destinations (her site, her
       * WhatsApp number). The Business Context declares a *channel*, never a URL,
       * so there is no real destination to write and the correct state is the
       * group's defined empty state: nothing published, nothing navigable, and
       * the buttons appear as soon as the owner adds them in the editor. The
       * marker is what distinguishes this from a legacy block that never had an
       * order, so the seeds cannot come back.
       */
      values[BUTTON_GROUP_ORDER] = '';
      values[BUTTON_GROUP_INITIALIZED] = BUTTON_GROUP_INITIALIZED_VALUE;
    }
    if (section.block === 'social' && layout && SOCIAL_PRESENTATION[layout]) values['socialPresentation'] = SOCIAL_PRESENTATION[layout];
    if (section.block === 'reviews') {
      /**
       * Microfase 3C · a generated page declares no review.
       *
       * `reviewsOrder` reads `props['block:<key>'].items` as the comma-separated
       * slot list and, when the key is absent, falls back to the editor's own
       * two demo slots — whose cards carry the editor's sample testimonials. The
       * Business Context carries no review from the owner, and a pack's demo
       * testimonials are not this business's customers, so the key is always
       * written empty: that is the block's defined empty state, and no made-up
       * name, rating or experience is ever attributed to a real business. The
       * owner fills the rows from the editor, where `addReview` appends to this
       * same list.
       */
      values['items'] = '';
    }
    if (section.block === 'separator' && layout && SEPARATOR_STYLES.indexOf(layout) !== -1) values['separatorStyle'] = layout;
    if (Object.keys(values).length > 0) props[blockPropScope(key, section.block)] = values;
  });
  /**
   * The hero's avatar, in its own scope: the template hands `EditableAvatar` the
   * id `avatar` (the native hero block keeps the empty prefix), and the engine's
   * media channel is the same one — `p['src'] ?? src`.
   */
  props['avatar'] = { src: content.images.portrait };
  return props;
}

/** Page-level tokens. Every key here is read by hooks/useThemeTokens.ts. */
export function buildMagicPageProps(family: TemplateFamily): Record<string, string> {
  return {
    family: family.pageFamily,
    font: engineFontId(family),
    bg: family.palette.bg,
    surfaceColor: family.palette.surface,
    mutedColor: family.palette.muted,
    lineColor: family.palette.border,
    accent: family.palette.accent,
    accentFg: family.palette.accentText,
    /**
     * Microfase 3A · this document's copy was generated from the Business
     * Context, so the hero draws the document instead of the engine's demo
     * sample. Read by `isBusinessContextContent` (utils/contentOrigin.ts); no
     * editor control writes it, so it can never appear on a hand-made page.
     */
    [CONTENT_ORIGIN_KEY]: BUSINESS_CONTEXT_ORIGIN,
  };
}

/* ------------------------------------------------------------------ */
/* Text styles                                                         */
/* ------------------------------------------------------------------ */

/**
 * Hero variants whose offered composition is centered.
 *
 * Verified against the landing preview itself, which is the contract the user
 * approved: `components/templates/TemplateHero.tsx` renders the name/role row
 * of `fullBleed` with `text-center` (line 105) and of `cinematic`/`magazine`
 * with a left-aligned top row, but the body row of `cinematic` (line 67),
 * `magazine` (line 278) and `backgroundFade` (line 43) is not centered either.
 * Only `fullBleed` draws its hero *content* centered, so only `fullBleed` is
 * listed: a family the preview does not center must not be centered here.
 *
 * The list drives both axes of that centering, so they can never drift apart:
 * `buildMagicTextStyles` writes `textStyles[id].align` from it (Microfase 1) and
 * `buildMagicBlockProps` writes the hero's `contentAlign` from it (Microfase
 * 2A). A family that is centered in one and not the other would draw centered
 * text inside a left-anchored block.
 */
const CENTERED_HERO_VARIANTS: readonly HeroVariant[] = ['fullBleed'];

/**
 * The hero text ids whose *alignment* the preview approves, so they are the ones
 * `buildMagicTextStyles` may style.
 *
 * Verified against `buildMagicTexts` below (`hero.name`/`hero.bio` for bio,
 * `hero.title`/`hero.eyebrow`/`hero.text` for business and portfolio) and the
 * renderers that read them (`BusinessTemplate.tsx:133,137,138`). The hero
 * description — `hero.text`, `hero.bio` — is drawn by `QuickProfileInfo`, and is
 * listed here because that component now draws it through `EditableText` and
 * therefore consumes `textStyles[id]`: the alignment written below reaches a
 * real text run instead of being stored for an id nothing read.
 *
 * A hero draws more than this list — the CTA label (`hero.cta.label`) among it —
 * but a button's own text is not a hero text run: it is centered by its row, not
 * by `text-align`, so no style is written for it either.
 */
function heroTextIds(family: TemplateFamily, context: BusinessContext): string[] {
  const name = (context.businessIdentity.name ?? '').trim() || PLACEHOLDER_BUSINESS_NAME;
  if (family.pageFamily === 'bio') {
    return (context.businessIdentity.description ?? '').trim() !== '' ?
      ['hero.name', 'hero.bio'] :
      ['hero.name'];
  }
  const ids = ['hero.title'];
  const businessType = getBusinessType(context.businessIdentity.type);
  if (businessType && businessType.label !== '') ids.push('hero.eyebrow');
  if ((context.businessIdentity.description ?? '').trim() !== '') ids.push('hero.text');
  // `name` is only read to mirror the placeholder rule; referencing it keeps the
  // two functions from drifting apart if the placeholder ever changes.
  void name;
  return ids;
}

/**
 * Text alignment for a family, derived deterministically from its hero variant.
 *
 * `textStyles` was previously always empty, so the alignment the preview
 * approves never reached the editor and the hero fell back to the template's
 * hardcoded branch (`HeroFrame.tsx:260` draws `fullBleed` as `items-start`).
 * The engine already reads `textStyles[id].align` (`utils/styles.ts:77`, applied
 * by `EditableText.tsx:81`), so the alignment travels through a property the
 * document contract already supports — `template.id` is untouched.
 *
 * Only ids the family actually fills are written (`heroTextIds`), so a style can
 * never point at a text that is not in the document.
 */
export function buildMagicTextStyles(
  family: TemplateFamily,
  context: BusinessContext,
): Record<string, TextStyle> {
  if (CENTERED_HERO_VARIANTS.indexOf(family.hero.variant) === -1) return {};
  const styles: Record<string, TextStyle> = {};
  heroTextIds(family, context).forEach((id) => {
    styles[id] = { align: 'center' };
  });
  return styles;
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

/** Safe, editable placeholder the brief allows while the name is unknown. */
export const PLACEHOLDER_BUSINESS_NAME = 'Tu negocio';

/**
 * Business data -> the text ids the selected template really renders.
 *
 * Only ids the three templates and GenericBlock already read are written
 * (verified in the isolated editor). Nothing factual is invented: the services
 * rows come from the family's own content pack — the same list the approved
 * preview drew — and phone, address, hours or reviews the owner never gave are
 * simply absent, so the engine keeps its own editable sample content for those
 * slots.
 */
export function buildMagicTexts(family: TemplateFamily, context: BusinessContext): Record<string, string> {
  const name = (context.businessIdentity.name ?? '').trim() || PLACEHOLDER_BUSINESS_NAME;
  const description = (context.businessIdentity.description ?? '').trim();
  const businessType = getBusinessType(context.businessIdentity.type);
  const typeLabel = businessType ? businessType.label : '';
  const content = resolveContent(family, context);
  const texts: Record<string, string> = {};

  /**
   * Microfase 3B · the services rows, in the ids `ServicesBlock` reads.
   *
   * Written before the family branches because `bio` carries a services section
   * too (Personal Brand). The field ids come from `serviceFieldId` — the same
   * helper the renderer and the editor panel use — so the document cannot write
   * a row under an id nothing reads. Every declared field is written, empty ones
   * included: `readService` falls back to the editor's generic sample for an
   * absent field, and a price the pack does not declare must stay undeclared
   * rather than be filled with one. The slot list itself lives in the block's
   * props, next to `rowTreatment`.
   */
  sectionEntries(family).forEach(({ key, section }) => {
    if (section.block !== 'services') return;
    declaredServices(content).forEach((service, index) => {
      const slot = String(index);
      texts[serviceFieldId(key, slot, 'title')] = service.title.trim();
      texts[serviceFieldId(key, slot, 'detail')] = service.detail.trim();
      texts[serviceFieldId(key, slot, 'price')] = service.price.trim();
    });
  });

  /**
   * Microfase 4C-1 · the caption each image card carries.
   *
   * The pack's own title and detail are the words the approved preview put on
   * the card, so they are the same template resource as the picture. They are
   * written under the caption id the block reads (`<key>/item.<slot>.title`) and
   * only when the pack declares one: a caption-less card draws no caption at
   * all, exactly as an empty one always did.
   */
  sectionEntries(family).forEach(({ key, section }) => {
    if (section.block !== 'imageCards') return;
    declaredImageCards(content).forEach((card, index) => {
      const caption = `${card.title.trim()}${
        card.title.trim() !== '' && card.detail.trim() !== '' ? ' · ' : ''
      }${card.detail.trim()}`;
      if (caption !== '') texts[`${imageCardId(key, String(index))}.title`] = caption;
    });
  });

  if (family.pageFamily === 'bio') {
    texts['hero.name'] = name;
    if (description !== '') texts['hero.bio'] = description;
    return texts;
  }

  texts['hero.title'] = name;
  if (typeLabel !== '') texts['hero.eyebrow'] = typeLabel;
  /**
   * The hero's action. Its label is the family's own action copy, resolved
   * exactly as the approved preview resolves it — `resolveContent` prefers the
   * channel the business chose and falls back to the family's pack — so the
   * button the visitor saw on the preview is the button the page carries, in
   * restaurant copy for Food Story instead of the `business` template's clinic
   * sample.
   *
   * It carries NO destination, because the Business Context holds the channel
   * and never a URL. That is the state the engine already renders as "visible
   * and selectable, but not a link", and the owner attaches their own link from
   * the editor. Inventing a `wa.me` or `mailto:` here would be inventing an
   * address the business never gave.
   *
   * With no action copy at all the id stays absent and the hero draws no action
   * row, rather than a button that says nothing.
   */
  if (content.cta !== '') texts['hero.cta.label'] = content.cta;
  if (description !== '') {
    if (family.pageFamily === 'business') texts['hero.text'] = description;
    if (family.sections.some((section) => section.block === 'text')) texts['text.body'] = description;
  }
  return texts;
}

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */

export interface MagicPageGenerationInput {
  businessContext: BusinessContext;
  selectedTemplateId: TemplateId;
  /**
   * Accepted so the Phase 8 hand-off can pass the assistant turn through, but
   * deliberately NOT consumed here: the Business Context is the single source of
   * truth, and its UPDATE_BUSINESS_CONTEXT action was already applied by the
   * session before generation. Reading it again would apply the same patch twice.
   */
  assistantResponse?: AssistantResponse;
}

/**
 * BusinessContext + selected conversational family -> MagicPageDocumentV1.
 *
 * Deterministic: same input, same document. The result is validated with the
 * engine own validateMagicPageDocumentV1 before it leaves this module, so an
 * invalid document can never reach the editor or save/publish.
 */
export function generateMagicPageDocument(input: MagicPageGenerationInput): MagicPageDocumentV1 {
  const family = getTemplate(input.selectedTemplateId);
  const document: MagicPageDocumentV1 = {
    documentType: MAGIC_DOCUMENT_TYPE,
    version: MAGIC_DOCUMENT_VERSION,
    template: { id: family.pageFamily },
    theme: {},
    content: {},
    texts: buildMagicTexts(family, input.businessContext),
    textStyles: buildMagicTextStyles(family, input.businessContext),
    props: { page: buildMagicPageProps(family), ...buildMagicBlockProps(family, input.businessContext) },
    blocks: buildMagicBlocks(family),
    removed: {},
    meta: { createdBy: 'magic-editor', schemaVersion: 1 },
  };
  return validateMagicPageDocumentV1(document);
}
