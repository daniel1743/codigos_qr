import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export type SignatureMode = 'idle' | 'hover' | 'listening' | 'processing' | 'finish';

interface SignatureBorderProps {
  mode: SignatureMode;
  radius: number;
}

const BLUE = '#0D4AA1';
const GOLD = '#D4AF37';

/*
 * Cripqer signature, revision 4: the approved brush, now travelling the whole
 * border.
 *
 * Revision 3 stopped the two colours fighting over one edge by parking blue on
 * the top edge and gold on the bottom one. That left the sides unwritten: the
 * signature died at one corner and was reborn at the next, which reads as a
 * break, not as circulation.
 *
 * This revision keeps the brush exactly as approved -- ONE filled cone whose
 * weight runs from 2.05px in the middle down to a hairline at both ends, filled
 * with a gradient that dissolves the outer fifth of each tip -- and only changes
 * where it travels. The outline is now sampled along the border itself, so the
 * brush bends with the corners instead of sliding across them, and it orbits the
 * whole composer once per lap. Nothing is layered: still one shape per colour.
 *
 * Both colours run the same way round, half a lap apart. The top edge and its
 * two corners are always less than half of the perimeter (a quarter turn is
 * shorter than any straight run that has a non-zero twin on the opposite edge),
 * so two streams half a lap apart can never overlap: the rotational symmetry
 * revision 3 achieved survives, without the dead sides.
 *
 * Rebuilding the outline as the brush moves means the timing has to live here
 * too now. landing.css keeps only the state machine -- which stream is visible
 * in which state, and the opacity crossfade between the two.
 *
 * The rate is the one thing the live assistant state may touch: while a reply
 * is really being prepared the same signature travels 30% faster, then eases
 * back, so the border doubles as the activity indicator. The brush, the
 * colours, the length and the phase are never restyled for it.
 */

/** Stroke weight at the middle of the signature: the approved central weight. */
const CENTRE_WIDTH = 2.05;
/** Stroke weight at the very tip: below the 1px neutral border, so the tail
 *  melts into that border instead of ending on it. */
const TIP_WIDTH = 0.5;
/** Signature length as a fraction of the straight run of the top edge. The
 *  approved revision measured 0.32 and 0.52; these are 60% longer. */
const CALM_LENGTH = 0.512;
const BUSY_LENGTH = 0.832;
/** The travel speed is inherited, not invented. Revision 3 slid a brush of
 *  PREV_*_LENGTH across its lane in PREV_*_DURATION seconds; this revision keeps
 *  that same on-screen speed, times SPEED_GAIN, now that one lap is the whole
 *  border. A lap therefore takes longer than the old slide, but the line moves
 *  at the pace that was already approved. */
const PREV_CALM_LENGTH = 0.32;
const PREV_BUSY_LENGTH = 0.52;
const PREV_CALM_DURATION = 11;
const PREV_BUSY_DURATION = 3.6;
const SPEED_GAIN = 1.2;
/** The travel revision 3 added at both ends of its lane, kept so the inherited
 *  speed is derived from exactly the distance that brush covered. */
const LANE_OVERHANG = 6;
/** While the assistant is genuinely busy the signature runs 30% faster: the
 *  border itself reports the work. Only the rate changes -- geometry, colour,
 *  length, weight, path and phase stay exactly as approved. */
const AI_SPEED_GAIN = 1.3;
/** Seconds of the exponential approach to AI_SPEED_GAIN, so the border eases
 *  into the faster rate and eases back out instead of snapping between two. */
const AI_SPEED_RAMP = 0.3;
/** Soft aura under the signature: same centreline, same length, weight scaled
 *  up, so it hugs the stroke instead of painting a bar of its own. */
const GLOW_SCALE = 1.9;
/** Outline sampling: one point per ~7px of arc, clamped, so the long busy brush
 *  is as smooth as the short calm one. */
const SAMPLE_SPACING = 7;
const SAMPLES_MIN = 48;
const SAMPLES_MAX = 160;
/** Where the gradient that paints a signature starts and stops fading: the outer
 *  fifth of each end dissolves into the neutral border. When a brush spans a
 *  corner the fade is measured on the chord between its two tips, which keeps
 *  both tips transparent wherever the brush happens to be. */
const TIP_FADE = 0.2;
/** Half a lap of separation between the blue and the gold stream. */
const PHASE_OFFSET = 0.5;
/** Review aid: ?sigPhase=0.25 pins the lap (as a fraction) instead of animating,
 *  so evidence screenshots of the same moment can be compared. */
const PHASE_PARAM = 'sigPhase';

const round = (value: number) => Math.round(value * 100) / 100;

const GROUPS = ['calm', 'busy'] as const;
const COLORS = ['blue', 'gold'] as const;

type GroupKey = (typeof GROUPS)[number];
type ColorKey = (typeof COLORS)[number];

const hexOf = (color: ColorKey) => (color === 'blue' ? BLUE : GOLD);

interface Ring {
  readonly inset: number;
  readonly w: number;
  readonly h: number;
  readonly r: number;
  readonly straightX: number;
  readonly straightY: number;
  readonly arc: number;
  readonly perimeter: number;
}

interface Stream {
  readonly length: number;
  readonly speed: number;
}

interface Geometry {
  readonly ring: Ring;
  readonly calm: Stream;
  readonly busy: Stream;
  readonly rest: number;
}

interface Sample {
  readonly x: number;
  readonly y: number;
  readonly nx: number;
  readonly ny: number;
  /** Position along the brush: 0 at the tail, 1 at the head. */
  readonly t: number;
}

interface Centreline {
  readonly samples: Sample[];
  readonly tailX: number;
  readonly tailY: number;
  readonly headX: number;
  readonly headY: number;
}

/** The rounded rectangle the brush travels: the composer border itself. */
function ringOf(sizeW: number, sizeH: number, radius: number): Ring {
  const inset = 0.75;
  const w = Math.max(sizeW - inset * 2, 0);
  const h = Math.max(sizeH - inset * 2, 0);
  const r = Math.max(radius - inset, 0);
  const straightX = Math.max(w - r * 2, 0);
  const straightY = Math.max(h - r * 2, 0);
  const arc = (Math.PI * r) / 2;
  return {
    inset,
    w,
    h,
    r,
    straightX,
    straightY,
    arc,
    perimeter: 2 * (straightX + straightY) + 4 * arc
  };
}

/**
 * Point on that border at arc length s, measured clockwise from the end of the
 * top-left corner. One continuous function of s, so a brush that straddles a
 * corner -- or the seam of the lap -- comes out as one unbroken shape.
 */
function pointAt(ring: Ring, s: number) {
  const x0 = ring.inset;
  const y0 = ring.inset;
  const x1 = ring.inset + ring.w;
  const y1 = ring.inset + ring.h;
  const r = ring.r;
  const a = ring.arc;
  const quarter = Math.PI / 2;
  let t = ((s % ring.perimeter) + ring.perimeter) % ring.perimeter;
  if (t <= ring.straightX) return { x: x0 + r + t, y: y0 };
  t -= ring.straightX;
  if (t <= a) {
    const th = (t / a) * quarter;
    return { x: x1 - r + r * Math.sin(th), y: y0 + r - r * Math.cos(th) };
  }
  t -= a;
  if (t <= ring.straightY) return { x: x1, y: y0 + r + t };
  t -= ring.straightY;
  if (t <= a) {
    const th = (t / a) * quarter;
    return { x: x1 - r + r * Math.cos(th), y: y1 - r + r * Math.sin(th) };
  }
  t -= a;
  if (t <= ring.straightX) return { x: x1 - r - t, y: y1 };
  t -= ring.straightX;
  if (t <= a) {
    const th = (t / a) * quarter;
    return { x: x0 + r - r * Math.sin(th), y: y1 - r + r * Math.cos(th) };
  }
  t -= a;
  if (t <= ring.straightY) return { x: x0, y: y1 - r - t };
  t -= ring.straightY;
  const th = (t / a) * quarter;
  return { x: x0 + r - r * Math.cos(th), y: y0 + r - r * Math.sin(th) };
}

/**
 * Centreline of one brush: the points it covers plus the border normal at each
 * one, so any number of widths can be extruded from a single pass.
 */
function centreline(ring: Ring, centre: number, length: number): Centreline {
  const count = Math.max(
    SAMPLES_MIN,
    Math.min(SAMPLES_MAX, Math.round(length / SAMPLE_SPACING))
  );
  const start = centre - length / 2;
  const probe = Math.max(length / count / 4, 0.25);
  const samples: Sample[] = [];
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const s = start + length * t;
    const here = pointAt(ring, s);
    const before = pointAt(ring, s - probe);
    const after = pointAt(ring, s + probe);
    const tx = after.x - before.x;
    const ty = after.y - before.y;
    const norm = Math.hypot(tx, ty) || 1;
    /* The normal is the tangent turned a quarter turn; its sign only decides
     * which side of the outline is written first. */
    samples.push({ x: here.x, y: here.y, nx: -ty / norm, ny: tx / norm, t });
  }
  const tail = pointAt(ring, start);
  const head = pointAt(ring, start + length);
  return { samples, tailX: tail.x, tailY: tail.y, headX: head.x, headY: head.y };
}

/** Raised cosine: full weight in the middle, a hairline at both tips, and a
 *  curve -- never a step -- in between. */
function halfAt(t: number, halfCentre: number, halfTip: number) {
  const peak = Math.abs(t * 2 - 1);
  return halfTip + ((halfCentre - halfTip) * (1 + Math.cos(Math.PI * peak))) / 2;
}

/**
 * Outline of a brush of the given weight along a centreline. The weight varies
 * along the shape, so the outline is a real curve: no staircase, no thick bar
 * with a thinner bar glued to its end, no cut across the head.
 */
function outlineOf(line: Centreline, halfCentre: number, halfTip: number) {
  const left: string[] = [];
  const right: string[] = [];
  for (const sample of line.samples) {
    const half = halfAt(sample.t, halfCentre, halfTip);
    left.push(round(sample.x + sample.nx * half) + ' ' + round(sample.y + sample.ny * half));
    right.push(round(sample.x - sample.nx * half) + ' ' + round(sample.y - sample.ny * half));
  }
  right.reverse();
  return 'M ' + left.concat(right).join(' L ') + ' Z';
}

function streamOf(geometry: Geometry, group: GroupKey) {
  return group === 'calm' ? geometry.calm : geometry.busy;
}

/** Which stream the composer state calls for; the rest of the state machine is
 *  the opacity crossfade in landing.css. */
function groupFor(mode: SignatureMode): GroupKey | null {
  if (mode === 'listening') return 'calm';
  if (mode === 'processing' || mode === 'finish') return 'busy';
  return null;
}

function buildGeometry(sizeW: number, sizeH: number, radius: number): Geometry | null {
  const ring = ringOf(sizeW, sizeH, radius);
  if (ring.perimeter <= 0 || ring.straightX <= 0) return null;
  /* Speed inherited from the approved slide: a brush of `factor` of the top run
   * covered `run - brush + overhang` in `duration` seconds. */
  const speedOf = (factor: number, duration: number) =>
  (SPEED_GAIN * Math.max(ring.straightX * (1 - factor) + LANE_OVERHANG * 2, 0)) / duration;
  return {
    ring,
    calm: { length: ring.straightX * CALM_LENGTH, speed: speedOf(PREV_CALM_LENGTH, PREV_CALM_DURATION) },
    busy: { length: ring.straightX * BUSY_LENGTH, speed: speedOf(PREV_BUSY_LENGTH, PREV_BUSY_DURATION) },
    /* Resting phase: the middle of the top edge, which is exactly where the
     * approved brush parked on hover -- and therefore the middle of the bottom
     * edge for the stream half a lap behind it. */
    rest: ring.straightX / 2
  };
}

function readPinnedPhase() {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(PHASE_PARAM);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function wrap(value: number, perimeter: number) {
  return ((value % perimeter) + perimeter) % perimeter;
}

/** Paints one stream wherever its phase puts it: aura first, then the crisp
 *  brush on top of it, with the gradient running from tip to tip. */
function paint(parts: Map<string, Element>, geometry: Geometry, group: GroupKey, phase: number) {
  const ring = geometry.ring;
  const length = streamOf(geometry, group).length;
  for (const color of COLORS) {
    const centre = phase + (color === 'gold' ? ring.perimeter * PHASE_OFFSET : 0);
    const line = centreline(ring, centre, length);
    const core = parts.get(group + '-' + color + '-core');
    const glow = parts.get(group + '-' + color + '-glow');
    const fill = parts.get(group + '-' + color + '-fill');
    if (core) core.setAttribute('d', outlineOf(line, CENTRE_WIDTH / 2, TIP_WIDTH / 2));
    if (glow) {
      glow.setAttribute('d', outlineOf(line, (CENTRE_WIDTH * GLOW_SCALE) / 2, (TIP_WIDTH * GLOW_SCALE) / 2));
    }
    if (fill) {
      fill.setAttribute('x1', String(round(line.tailX)));
      fill.setAttribute('y1', String(round(line.tailY)));
      fill.setAttribute('x2', String(round(line.headX)));
      fill.setAttribute('y2', String(round(line.headY)));
    }
  }
}

export function SignatureBorder({ mode, radius }: SignatureBorderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const parts = useRef<Map<string, Element>>(new Map());
  const phases = useRef<Map<GroupKey, number>>(new Map());
  /* Multiplier the assistant state drives; it only ever scales time. */
  const aiRate = useRef(1);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const pinned = useMemo(readPinnedPhase, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geometry = useMemo(() => buildGeometry(size.w, size.h, radius), [size.w, size.h, radius]);

  /* Collect the shapes once per geometry change and park both streams at the
   * resting phase, so a composer that is only being hovered shows what the
   * approved brush showed: the same signature, sitting in the middle of its
   * travel. */
  useLayoutEffect(() => {
    if (!geometry) return;
    const found = new Map<string, Element>();
    svg.current?.querySelectorAll('[data-sig-part]').forEach((node) => {
      const key = node.getAttribute('data-sig-part');
      if (key) found.set(key, node);
    });
    parts.current = found;
    const rest = pinned === null ? geometry.rest : pinned * geometry.ring.perimeter;
    for (const group of GROUPS) {
      phases.current.set(group, rest);
      paint(found, geometry, group, rest);
    }
  }, [geometry, pinned]);

  /* One lap per stream. The clock only runs while a stream is on screen: idle
   * and hover keep the resting phase, exactly like the approved revision, whose
   * animation was likewise paused outside those states. */
  useEffect(() => {
    const group = groupFor(mode);
    if (!geometry || group === null || reduced || pinned !== null) {
      aiRate.current = 1;
      return undefined;
    }
    const perimeter = geometry.ring.perimeter;
    const base = streamOf(geometry, group).speed;
    const target = mode === 'processing' ? AI_SPEED_GAIN : 1;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last === 0 ? 0 : Math.min((now - last) / 1000, 0.25);
      last = now;
      const blend = 1 - Math.exp(-dt / AI_SPEED_RAMP);
      aiRate.current += (target - aiRate.current) * blend;
      const next = wrap((phases.current.get(group) ?? geometry.rest) + base * aiRate.current * dt, perimeter);
      phases.current.set(group, next);
      paint(parts.current, geometry, group, next);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [geometry, mode, reduced, pinned]);

  const gradient = (group: GroupKey, color: ColorKey) =>
  <linearGradient
    key={group + '-' + color}
    id={'sig-' + group + '-' + color + '-' + uid}
    gradientUnits="userSpaceOnUse"
    x1="0"
    y1="0"
    x2="1"
    y2="0"
    data-sig-part={group + '-' + color + '-fill'}>
      <stop offset="0" stopColor={hexOf(color)} stopOpacity="0" />
      <stop offset={TIP_FADE} stopColor={hexOf(color)} stopOpacity="1" />
      <stop offset={1 - TIP_FADE} stopColor={hexOf(color)} stopOpacity="1" />
      <stop offset="1" stopColor={hexOf(color)} stopOpacity="0" />
    </linearGradient>;

  const stream = (group: GroupKey, color: ColorKey) =>
  <g key={group + '-' + color} className={'sig-seg ' + (color === 'blue' ? 'sig-blue' : 'sig-gold')}>
      <path
      className="sig-glow"
      fill={'url(#sig-' + group + '-' + color + '-' + uid + ')'}
      data-sig-part={group + '-' + color + '-glow'} />
      <path
      fill={'url(#sig-' + group + '-' + color + '-' + uid + ')'}
      data-sig-part={group + '-' + color + '-core'} />
    </g>;

  return (
    <div ref={ref} data-sig={mode} className="sig-root pointer-events-none absolute inset-0" aria-hidden>
      {geometry !== null &&
      <svg ref={svg} width={size.w} height={size.h} className="absolute inset-0 overflow-visible">
          <defs>{GROUPS.map((group) => COLORS.map((color) => gradient(group, color)))}</defs>
          <g className="sig-calm">{COLORS.map((color) => stream('calm', color))}</g>
          <g className="sig-busy">{COLORS.map((color) => stream('busy', color))}</g>
        </svg>
      }
    </div>);

}
