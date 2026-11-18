import React, { useLayoutEffect, useRef, useState } from 'react';

export type SignatureMode = 'idle' | 'hover' | 'listening' | 'processing' | 'finish';

interface SignatureBorderProps {
  mode: SignatureMode;
  radius: number;
}

/**
 * Cripqer signature: two short streams of brand light (blue + gold)
 * that travel around the perimeter of the element. Never a full rotating gradient.
 */
export function SignatureBorder({ mode, radius }: SignatureBorderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const inset = 0.75;
  const w = Math.max(size.w - inset * 2, 0);
  const h = Math.max(size.h - inset * 2, 0);
  const rx = Math.max(radius - inset, 0);

  const rect = (cls: string, color: string, width: number) =>
  <rect
    x={inset}
    y={inset}
    width={w}
    height={h}
    rx={rx}
    pathLength={100}
    fill="none"
    stroke={color}
    strokeWidth={width}
    strokeLinecap="round"
    className={cls} />;



  return (
    <div ref={ref} data-sig={mode} className="sig-root pointer-events-none absolute inset-0" aria-hidden>
      {w > 0 &&
      <svg width={size.w} height={size.h} className="absolute inset-0 overflow-visible">
          <g className="sig-calm">
            {rect('sig-seg sig-blue sig-halo', '#0D4AA1', 5)}
            {rect('sig-seg sig-gold sig-halo', '#D4AF37', 5)}
            {rect('sig-seg sig-blue', '#0D4AA1', 1.75)}
            {rect('sig-seg sig-gold', '#D4AF37', 1.75)}
          </g>
          <g className="sig-busy">
            {rect('sig-seg sig-blue sig-long sig-halo', '#0D4AA1', 6)}
            {rect('sig-seg sig-gold sig-long sig-halo', '#D4AF37', 6)}
            {rect('sig-seg sig-blue sig-long', '#0D4AA1', 2)}
            {rect('sig-seg sig-gold sig-long', '#D4AF37', 2)}
          </g>
        </svg>
      }
    </div>);

}