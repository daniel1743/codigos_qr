import React from 'react';
import { MapPinIcon } from 'lucide-react';

interface MapIllustrationProps {
  accent: string;
  radius: number;
}

/** A calm, on-brand map placeholder (streets drawn with the section's own line color). */
export function MapIllustration({ accent, radius }: MapIllustrationProps) {
  return (
    <div className="cq-surface relative aspect-[16/10] w-full overflow-hidden" style={{ borderRadius: radius }}>
      <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g stroke="var(--line)" strokeWidth="10" fill="none" strokeLinecap="round">
          <path d="M-10 70 L420 40" />
          <path d="M-10 190 L420 170" />
          <path d="M90 -10 L130 260" />
          <path d="M270 -10 L250 260" />
        </g>
        <g stroke="var(--line)" strokeWidth="4" fill="none" opacity="0.8">
          <path d="M-10 130 L420 110" />
          <path d="M190 -10 L200 260" />
          <path d="M330 -10 L350 260" />
          <path d="M30 -10 L50 260" />
        </g>
        <path d="M-10 230 C 80 200, 160 250, 240 215 S 380 200, 420 225" stroke="var(--muted)" strokeOpacity="0.25" strokeWidth="14" fill="none" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <span className="grid h-11 w-11 place-items-center rounded-full shadow-lg" style={{ background: accent }}>
          <MapPinIcon className="h-5 w-5 text-white" strokeWidth={2} />
        </span>
      </div>
    </div>);

}