import React from 'react';
import { MapPinIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

interface MapIllustrationProps {
  accent: string;
  radius: number;
}

/** A calm, on-brand map placeholder (streets drawn with the section's own line color). */
export function MapIllustration({ accent, radius }: MapIllustrationProps) {
  const { isMobile } = useEditor();
  const id = React.useId().replace(/:/g, '');
  const fadeId = `luxury-map-fade-${id}`;
  const glowId = `luxury-map-glow-${id}`;

  return (
    <div data-map-style="refined-map" className="relative aspect-[16/10] w-full overflow-hidden" style={{ borderRadius: radius, background: '#0B0B0A', boxShadow: `inset 0 0 0 1px ${accent}55` }}>
      <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={fadeId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="0.18" />
            <stop offset="0.2" stopColor="white" stopOpacity="0.9" />
            <stop offset="0.82" stopColor="white" stopOpacity="0.9" />
            <stop offset="1" stopColor="white" stopOpacity="0.12" />
          </linearGradient>
          <radialGradient id={glowId} cx="58%" cy="43%" r="50%">
            <stop offset="0" stopColor={accent} stopOpacity="0.16" />
            <stop offset="0.55" stopColor={accent} stopOpacity="0.04" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <mask id={`${fadeId}-mask`}>
            <rect width="400" height="250" fill={`url(#${fadeId})`} />
          </mask>
        </defs>
        <rect width="400" height="250" fill="#0B0B0A" />
        <g mask={`url(#${fadeId}-mask)`} fill="none" stroke={accent} strokeLinecap="round">
          <g strokeWidth="1.8" opacity="0.27">
            <path d="M-20 48 L66 42 C102 40 123 58 157 61 L252 70 C297 75 335 59 430 43" />
            <path d="M-20 106 L70 103 C103 102 129 119 164 124 L246 137 C304 146 352 132 430 116" />
            <path d="M-15 196 L72 181 C112 174 143 190 178 193 L270 201 C324 205 362 191 430 177" />
            <path d="M78 -20 L89 47 L108 91 L124 147 L118 205 L139 270" />
            <path d="M205 -20 L211 48 L198 93 L207 143 L194 198 L222 270" />
            <path d="M314 -20 L300 45 L315 92 L284 143 L294 198 L276 270" />
          </g>
          {!isMobile && <g strokeWidth="1" opacity="0.15">
            <path d="M-20 78 L54 73 L116 83 L180 76 L246 88 L315 78 L430 85" />
            <path d="M-20 151 L45 143 L96 154 L160 148 L231 162 L310 151 L430 161" />
            <path d="M-20 225 L62 215 L119 229 L188 218 L255 232 L331 219 L430 228" />
            <path d="M38 -20 L51 46 L45 102 L61 162 L49 221 L58 270" />
            <path d="M158 -20 L171 44 L158 94 L174 151 L160 211 L175 270" />
            <path d="M366 -20 L350 43 L363 96 L344 151 L360 211 L348 270" />
          </g>}
          <path d="M-10 228 C61 204 115 215 160 184 S235 116 285 123 S358 157 420 112" strokeWidth="2.4" opacity="0.34" strokeDasharray="3 7" />
        </g>
        <rect width="400" height="250" fill={`url(#${glowId})`} />
      </svg>
      <div className="absolute left-[58%] top-[43%] -translate-x-1/2 -translate-y-1/2">
        <span className="absolute -inset-2 rounded-full border" style={{ borderColor: `${accent}40` }} aria-hidden="true" />
        <span className="relative grid h-12 w-12 place-items-center rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.32)]" style={{ background: accent }}>
          <MapPinIcon className="h-5 w-5 text-[#FBF7EF]" strokeWidth={1.8} />
        </span>
      </div>
    </div>);

}
