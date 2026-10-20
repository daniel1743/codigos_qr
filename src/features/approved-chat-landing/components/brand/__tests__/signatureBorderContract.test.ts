import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Signature border contract (revision 4).
 *
 * The brush shape is rebuilt as it travels, so the animation is no longer
 * described by the stylesheet. This suite reads the component and the stylesheet
 * and locks what revision 4 promises: the approved brush is unchanged, both
 * brushes run 60% longer than the approved revision, they travel 20% faster, and
 * they orbit the whole border half a lap apart -- which is what keeps two
 * streams that share a border from ever overlapping.
 */
const COMPONENT = 'src/features/approved-chat-landing/components/brand/SignatureBorder.tsx';
const STYLES = 'src/features/approved-chat-landing/styles/landing.css';

/* Desktop composer of the approved landing: 860x124 at a 28px radius. */
const COMPOSER = { w: 860, h: 124, radius: 28 };

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function constant(source: string, name: string): number {
  const match = new RegExp('const ' + name + ' = ([0-9.]+);').exec(source);
  if (!match) throw new Error('constant not found: ' + name);
  return Number(match[1]);
}

/* Mirrors ringOf() in the component. */
function ring(size: { w: number; h: number; radius: number }) {
  const inset = 0.75;
  const w = size.w - inset * 2;
  const h = size.h - inset * 2;
  const r = size.radius - inset;
  const straightX = w - r * 2;
  const straightY = h - r * 2;
  const arc = (Math.PI * r) / 2;
  return { straightX, straightY, arc, perimeter: 2 * (straightX + straightY) + 4 * arc };
}

describe('signature border contract (approved chat landing)', () => {
  const source = read(COMPONENT);
  const css = read(STYLES);
  const centre = constant(source, 'CENTRE_WIDTH');
  const tip = constant(source, 'TIP_WIDTH');
  const calm = constant(source, 'CALM_LENGTH');
  const busy = constant(source, 'BUSY_LENGTH');
  const previousCalm = constant(source, 'PREV_CALM_LENGTH');
  const previousBusy = constant(source, 'PREV_BUSY_LENGTH');
  const previousCalmDuration = constant(source, 'PREV_CALM_DURATION');
  const previousBusyDuration = constant(source, 'PREV_BUSY_DURATION');
  const gain = constant(source, 'SPEED_GAIN');
  const overhang = constant(source, 'LANE_OVERHANG');
  const offset = constant(source, 'PHASE_OFFSET');
  const fade = constant(source, 'TIP_FADE');

  it('A) keeps the approved brush: one shape, raised cosine weight, dissolved tips', () => {
    expect(centre).toBe(2.05);
    expect(tip).toBe(0.5);
    expect(tip < centre).toBe(true);
    expect(fade > 0 && fade < 0.5).toBe(true);
    expect(source).toContain('Math.cos(Math.PI * peak)');
    expect(source).toContain('function outlineOf');
    // The layered dash technique that read as glued pieces is gone for good.
    expect(source).not.toContain('strokeDasharray');
    expect(css).not.toContain('stroke-dasharray');
  });

  it('B) runs both brushes 60% longer than the approved revision', () => {
    expect(Math.abs(calm / previousCalm - 1.6) < 1e-12).toBe(true);
    expect(Math.abs(busy / previousBusy - 1.6) < 1e-12).toBe(true);
  });

  it('C) inherits the approved speed and adds exactly 20%', () => {
    expect(gain).toBe(1.2);
    expect(source).toContain('speedOf(PREV_CALM_LENGTH, PREV_CALM_DURATION)');
    expect(source).toContain('speedOf(PREV_BUSY_LENGTH, PREV_BUSY_DURATION)');
    const box = ring(COMPOSER);
    const approved = (factor: number, duration: number) =>
      Math.max(box.straightX * (1 - factor) + overhang * 2, 0) / duration;
    expect(Math.abs((gain * approved(previousCalm, previousCalmDuration)) / approved(previousCalm, previousCalmDuration) - 1.2) < 1e-12).toBe(true);
    expect(Math.abs((gain * approved(previousBusy, previousBusyDuration)) / approved(previousBusy, previousBusyDuration) - 1.2) < 1e-12).toBe(true);
  });

  it('D) travels one closed lap of the border, so the sides are never skipped', () => {
    const box = ring(COMPOSER);
    expect(Math.abs(box.perimeter - 1915.22) < 0.5).toBe(true);
    expect(source).toContain('function pointAt');
    expect(source).toContain('function centreline');
    expect(source).toContain('function wrap');
    expect(source).toContain('ring.perimeter');
    // The old slide, which died at one corner and was reborn at the next, is gone.
    expect(css).not.toContain('sig-lane-forward');
    expect(css).not.toContain('sig-lane-backward');
  });

  it('E) keeps the two brushes half a lap apart, so they can never overlap', () => {
    expect(offset).toBe(0.5);
    const box = ring(COMPOSER);
    const calmLength = box.straightX * calm;
    const busyLength = box.straightX * busy;
    expect(calmLength < box.perimeter * offset).toBe(true);
    expect(busyLength < box.perimeter * offset).toBe(true);
    expect(box.perimeter * offset - busyLength > 0).toBe(true);
    // The top edge plus its two corners is under half the lap, so one edge can
    // never hold both brushes.
    expect((box.straightX + 2 * box.arc) / box.perimeter < offset).toBe(true);
  });

  it('F) leaves the state machine and the aura to the stylesheet', () => {
    expect(css).toContain("[data-sig='hover'] .sig-calm");
    expect(css).toContain("[data-sig='listening'] .sig-calm");
    expect(css).toContain("[data-sig='processing'] .sig-busy");
    expect(css).toContain('.sig-glow');
    expect(css).not.toContain('animation-play-state');
    expect(source).toContain("useMediaQuery('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('sigPhase');
  });

  it('G) accelerates the signature only while the assistant is working', () => {
    /* The signal is the real session state, never a timer: `processing` is the
       mode the composer derives from `thinking`. */
    expect(constant(source, 'AI_SPEED_GAIN')).toBe(1.3);
    expect(constant(source, 'AI_SPEED_RAMP') > 0).toBe(true);
    expect(source).toContain("const target = mode === 'processing' ? AI_SPEED_GAIN : 1;");
    /* Eased in and out, never snapped between two rates. */
    expect(source).toContain('1 - Math.exp(-dt / AI_SPEED_RAMP)');
    /* The boosted rate is integrated into the phase, so the brush keeps its
       position and only its pace changes. */
    expect(source).toContain('base * aiRate.current * dt');
    /* Appearance frozen: the boost cannot reach geometry or colour. */
    expect(source).not.toContain('AI_SPEED_GAIN *');
    expect(source).not.toContain('AI_SPEED_GAIN +');
    expect(css).toContain("[data-sig='processing'] .sig-busy");
  });
});
