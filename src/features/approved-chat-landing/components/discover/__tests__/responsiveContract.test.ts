import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Mobile responsive contract of the approved conversational landing.
 *
 * The port must stay pixel-identical to the frozen reference above the desktop
 * breakpoint, so the whole mobile composition is expressed with responsive
 * utilities only. This suite locks that contract down without a browser: it
 * reads the two components that own the mobile geometry, resolves the numbers
 * their classes declare and checks the resulting layout.
 *
 * Constants used by the maths:
 *   - the showcase strip is `-mx-5 px-[8vw]` inside a stage that already applies
 *     `px-5`, so the strip is exactly one viewport wide and its padding is what
 *     centres the 84vw protagonist card;
 *   - the mobile strip has no gap (`gap-0`): the visual gutter between the
 *     protagonist and the peek comes from the neighbour focus scale instead;
 *   - that scale shrinks the neighbouring card around its centre, so the visible
 *     sliver of the next card is `pad - card * (1 - scale) / 2`;
 *   - the template preview renders a real 390px page (TemplatePage PAGE_WIDTH)
 *     and is scaled by the card width, so a card must never exceed 390px to
 *     stay sharp;
 *   - measured on the frozen reference render (390x844): the mobile title line
 *     "sin empezar desde cero." is 325px wide at 27px, i.e. 12.04em.
 */
const REFERENCE_PAGE_WIDTH = 390;
const PAGE_PADDING = 20;
const TITLE_EM_WIDTH = 12.04;
const VIEWPORTS = [320, 360, 390, 430];
const DISCOVER_DIR = 'src/features/approved-chat-landing/components/discover';

function readComponent(file: string): string {
  return readFileSync(resolve(process.cwd(), DISCOVER_DIR, file), 'utf8');
}

function classOf(source: string, anchor: string): string {
  const at = source.indexOf(anchor);
  if (at < 0) throw new Error('anchor not found: ' + anchor);
  return source.slice(source.lastIndexOf('"', at) + 1, source.indexOf('"', at));
}

function numberFrom(source: string, pattern: RegExp): number {
  const match = pattern.exec(source);
  if (!match) throw new Error('value not found: ' + String(pattern));
  return Number(match[1]);
}

describe('mobile responsive contract (approved chat landing)', () => {
  const showcase = readComponent('TemplateShowcase.tsx');
  const discover = readComponent('DiscoverStage.tsx');
  const cardClass = classOf(showcase, 'shrink-0 snap-center');
  const stripClass = classOf(showcase, 'snap-x snap-mandatory');
  const focusClass = classOf(showcase, 'scale-[var(--focus-scale)]');
  const stageClass = classOf(discover, 'max-w-[1400px]');
  const galleryClass = classOf(discover, 'mt-5 min-h-');
  const quickClass = classOf(discover, 'no-scrollbar');
  const quickButtonClass = classOf(discover, 'inline-flex min-h-11');
  const titleClass = classOf(discover, 'font-display');
  const quickTokens = quickClass.split(/\s+/);
  const buttonTokens = quickButtonClass.split(/\s+/);
  const neighbourScale = numberFrom(showcase, /const NEIGHBOUR_SCALE = ([0-9.]+);/);
  const farScale = numberFrom(showcase, /const FAR_SCALE = ([0-9.]+);/);

  function cardWidthAt(viewport: number): number {
    const vw = numberFrom(cardClass, /w-\[([0-9.]+)vw\]/);
    const cap = numberFrom(cardClass, /max-w-\[([0-9]+)px\]/);
    return Math.min((vw / 100) * viewport, cap);
  }

  it('A) shows one protagonist card plus a discreet peek of the next one', () => {
    const padVw = numberFrom(stripClass, /px-\[([0-9.]+)vw\]/);
    const cardVw = numberFrom(cardClass, /w-\[([0-9.]+)vw\]/);
    const gap = numberFrom(stripClass, /gap-([0-9.]+)/);
    // Equal gutters on both sides keep the protagonist card optically centred.
    expect(Math.abs(padVw * 2 + cardVw - 100) < 0.001).toBe(true);
    expect(cardVw >= 84 && cardVw <= 88).toBe(true);
    expect(gap).toBe(0);
    VIEWPORTS.forEach((viewport) => {
      const pad = (padVw / 100) * viewport;
      const card = cardWidthAt(viewport);
      const peek = pad - (card * (1 - neighbourScale)) / 2 - gap;
      const ratio = peek / card;
      expect(ratio >= 0.06 && ratio <= 0.1).toBe(true);
      expect(card <= REFERENCE_PAGE_WIDTH).toBe(true);
      expect(card >= 200).toBe(true);
    });
  });

  it('B) keeps the mobile strip exactly one viewport wide and scrollable', () => {
    expect(stageClass.includes('px-5 md:px-10')).toBe(true);
    expect(stripClass.includes('-mx-5')).toBe(true);
    expect(stripClass.includes('overflow-x-auto')).toBe(true);
    expect(stripClass.includes('snap-x')).toBe(true);
    expect(stripClass.includes('snap-mandatory')).toBe(true);
    expect(stripClass.includes('no-scrollbar')).toBe(true);
    expect(stripClass.includes('relative')).toBe(true);
    expect(cardClass.includes('shrink-0')).toBe(true);
    expect(cardClass.includes('snap-center')).toBe(true);
  });

  it('C) never lets the mobile title wrap past two lines', () => {
    expect(titleClass.includes('text-[min(26px,7vw)]')).toBe(true);
    VIEWPORTS.forEach((viewport) => {
      const cap = numberFrom(titleClass, /min\(([0-9]+)px/);
      const scale = numberFrom(titleClass, /min\([0-9]+px,([0-9.]+)vw\)/);
      const font = Math.min(cap, (scale / 100) * viewport);
      expect(font * TITLE_EM_WIDTH <= viewport - 2 * PAGE_PADDING).toBe(true);
    });
  });

  it('D) lets the gallery own the free height so the composer sits under it', () => {
    // The gallery owns the free height at every breakpoint, but it must be able to
    // shrink below its content so the composer keeps its approved size on short
    // viewports (1280x600, 360x640). A 280px floor let the showcase overflow behind
    // the input. `flex-1` below is the single base token that now carries the
    // desktop guarantee too; `md:flex-1` was redundant and was dropped with the floor.
    expect(galleryClass.includes('flex-1')).toBe(true);
    expect(galleryClass.includes('min-h-0')).toBe(true);
    expect(galleryClass.includes('h-[48vh]')).toBe(false);
    expect(galleryClass.includes('min-h-[280px]')).toBe(false);
    expect(galleryClass.includes('md:min-h-[280px]')).toBe(false);
  });

  it('E) keeps quick actions fully visible without horizontal scrolling', () => {
    expect(quickClass.includes('grid-cols-2')).toBe(true);
    expect(quickClass.includes('gap-2')).toBe(true);
    expect(quickTokens.includes('overflow-x-auto')).toBe(false);
    expect(quickClass.includes('md:flex')).toBe(true);
    expect(quickClass.includes('md:justify-center')).toBe(true);
    expect(buttonTokens.includes('whitespace-nowrap')).toBe(false);
    expect(buttonTokens.includes('shrink-0')).toBe(false);
    expect(quickButtonClass.includes('min-h-11')).toBe(true);
    expect(quickButtonClass.includes('w-full')).toBe(true);
    expect(quickButtonClass.includes('text-left')).toBe(true);
    expect(quickButtonClass.includes('md:h-9')).toBe(true);
    expect(quickButtonClass.includes('md:min-h-0')).toBe(true);
    expect(quickButtonClass.includes('md:w-auto')).toBe(true);
    expect(quickButtonClass.includes('md:shrink-0')).toBe(true);
    expect(quickButtonClass.includes('md:whitespace-nowrap')).toBe(true);
    expect(quickButtonClass.includes('md:px-3.5')).toBe(true);
  });

  it('F) scales only the neighbouring cards and neutralises it on desktop', () => {
    expect(focusClass.includes('scale-[var(--focus-scale)]')).toBe(true);
    expect(focusClass.includes('transition-[scale]')).toBe(true);
    expect(focusClass.includes('md:scale-none')).toBe(true);
    expect(neighbourScale >= 0.88 && neighbourScale <= 0.93).toBe(true);
    expect(farScale >= 0.88 && farScale <= 0.93).toBe(true);
    expect(farScale < neighbourScale).toBe(true);
    // The active card is the one closest to the centre of the scrollport.
    expect(showcase.includes("'--focus-scale' as string")).toBe(true);
    expect(showcase.includes('el.scrollLeft + el.clientWidth / 2')).toBe(true);
    expect(showcase.includes("addEventListener('scroll'")).toBe(true);
  });

  it('H) shows four centred cards on desktop without touching the mobile tokens', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/features/approved-chat-landing/styles/landing.css'),
      'utf8'
    );
    expect(showcase.includes('const DESKTOP_CARDS = 4;')).toBe(true);
    expect(showcase.includes('data-showcase-row')).toBe(true);
    expect(showcase.includes('data-showcase-card')).toBe(true);
    expect(showcase.includes("i >= DESKTOP_CARDS ? '' : undefined")).toBe(true);
    // The desktop row is narrowed by a scoped override, not by new utilities, so
    // the mobile tokens above stay byte-identical.
    expect(css.includes('[data-showcase-row] > [data-showcase-card]')).toBe(true);
    expect(css.includes('width: calc((100% - 4rem) / 5)')).toBe(true);
    expect(css.includes('[data-showcase-row] > [data-showcase-card][data-slot-hidden]')).toBe(true);
    expect(cardClass.includes('w-[84vw]')).toBe(true);
    expect(cardClass.includes('md:w-auto')).toBe(true);
  });

  it('G) leaves the approved desktop composition untouched', () => {
    ['md:w-auto', 'md:max-w-none', 'md:flex-1'].forEach((token) => {
      expect(cardClass.includes(token)).toBe(true);
    });
    ['md:mx-0', 'md:px-0', 'md:gap-4', 'md:overflow-visible', 'md:[perspective:1800px]'].forEach((token) => {
      expect(stripClass.includes(token)).toBe(true);
    });
    ['md:mt-[3vh]'].forEach((token) => {
      expect(galleryClass.includes(token)).toBe(true);
    });
    ['md:text-[40px]', 'xl:text-[44px]', 'xl:leading-[1.06]'].forEach((token) => {
      expect(titleClass.includes(token)).toBe(true);
    });
    ['md:mx-0', 'md:mt-3', 'md:justify-center', 'md:px-0', 'md:overflow-x-auto'].forEach((token) => {
      expect(quickClass.includes(token)).toBe(true);
    });
  });
});
