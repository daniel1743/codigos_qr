import React from 'react';
import { MapPinIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

interface MapIllustrationProps {
  accent: string;
  radius: number;
  background?: string;
  foreground?: string;
}

/** A quiet, parchment-toned map placeholder that keeps the location pin prominent. */
export function MapIllustration({ accent, radius, background = '#F4F1E8', foreground = '#FBF7EF' }: MapIllustrationProps) {
  const { isMobile } = useEditor();
  const id = React.useId().replace(/:/g, '');
  const shadeId = `map-shade-${id}`;

  return (
    <div
      data-map-style="refined-map"
      className="relative aspect-[16/10] w-full overflow-hidden"
      style={{ borderRadius: radius, background, boxShadow: 'inset 0 0 0 1px rgba(91, 79, 57, 0.12)' }}
    >
      <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.24" />
            <stop offset="1" stopColor="#B8AA8E" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <rect width="400" height="250" fill={background} />
        {/* A few broad blocks make the street pattern read like a place, not a grid. */}
        <path d="M0 0h104l20 72-32 62-92 8zM238 0h162v74l-72 25-68-18zM0 185l84-20 47 85H0zM270 157l130-22v115H296z" fill="#E9E3D6" opacity="0.65" />
        <g fill="none" stroke="#C9C0AE" strokeLinecap="round" strokeLinejoin="round" opacity="0.72">
          <g strokeWidth="1.5">
            <path d="M-12 48 58 43l49 12 45-7 63 15 59-5 67 12 72-9" />
            <path d="M-12 112 54 105l52 13 48-8 61 16 59-6 67 13 71-10" />
            <path d="M-12 184 62 171l45 10 48-8 63 16 58-5 67 14 75-12" />
            <path d="M68-12 77 48l-8 56 16 57-7 60 16 53" />
            <path d="M181-12 188 46l-12 59 19 58-11 58 18 53" />
            <path d="M300-12 287 47l13 58-21 57 16 59-8 53" />
          </g>
          {!isMobile && <g strokeWidth="1" opacity="0.55">
            <path d="M-10 78 44 72l56 9 54-8 59 10 61-7 58 9 80-8" />
            <path d="M-10 148 46 139l53 11 58-7 57 12 60-8 57 12 82-10" />
            <path d="M130-10 141 48l-8 57 17 57-8 60 13 56" />
            <path d="M247-10 238 48l13 59-18 56 14 59-7 56" />
          </g>}
        </g>
        {/* Main road */}
        <path d="M-10 222 C65 204 104 201 153 172 S238 129 278 137 344 158 414 117" fill="none" stroke="#FFFDF8" strokeWidth="9" strokeLinecap="round" opacity="0.9" />
        <path d="M-10 222 C65 204 104 201 153 172 S238 129 278 137 344 158 414 117" fill="none" stroke="#D5C5A3" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
        <rect width="400" height="250" fill={`url(#${shadeId})`} />
      </svg>
      <div className="absolute left-[58%] top-[43%] -translate-x-1/2 -translate-y-1/2">
        <span className="absolute -inset-2 rounded-full bg-white/50" aria-hidden="true" />
        <span className="relative grid h-11 w-11 place-items-center rounded-full shadow-[0_5px_16px_rgba(39,34,24,0.24)] ring-4 ring-white/70" style={{ background: accent }}>
          <MapPinIcon className="h-5 w-5" color={foreground} strokeWidth={2} fill="currentColor" fillOpacity={0.12} />
        </span>
      </div>
    </div>
  );
}
