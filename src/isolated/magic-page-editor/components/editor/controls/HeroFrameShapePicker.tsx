import React from 'react';
import { cx } from '../../../utils/cx';
import type { HeroShape } from '../../blocks/HeroFrame';

export const heroFrameShapes: { value: HeroShape; label: string }[] = [
  { value: 'curve', label: 'Curva abajo' },
  { value: 'straight', label: 'Recta' },
  { value: 'inset', label: 'Enmarcada' },
  { value: 'curve-deep', label: 'Curva profunda' },
  { value: 'curve-up', label: 'Curva arriba' },
  { value: 'curve-up-deep', label: 'Curva arriba profunda' },
  { value: 'wave', label: 'Onda' },
  { value: 'wave-double', label: 'Onda doble' },
  { value: 'arch', label: 'Arco' },
];

function previewStyle(shape: HeroShape): React.CSSProperties {
  if (shape === 'curve') return { borderBottomLeftRadius: '50% 18px', borderBottomRightRadius: '50% 18px' };
  if (shape === 'curve-deep') return { borderBottomLeftRadius: '50% 28px', borderBottomRightRadius: '50% 28px' };
  if (shape === 'curve-up') return { borderTopLeftRadius: '50% 18px', borderTopRightRadius: '50% 18px' };
  if (shape === 'curve-up-deep') return { borderTopLeftRadius: '50% 28px', borderTopRightRadius: '50% 28px' };
  if (shape === 'wave') return { borderBottomLeftRadius: '32% 12px', borderBottomRightRadius: '68% 20px' };
  if (shape === 'wave-double') return { borderBottomLeftRadius: '68% 20px', borderBottomRightRadius: '32% 12px' };
  if (shape === 'arch') return { borderRadius: '50% 50% 8px 8px / 24px 24px 8px 8px' };
  if (shape === 'inset') return { margin: 4, borderRadius: 5 };
  return {};
}

export function HeroFrameShapePicker({ value, onChange }: { value: HeroShape; onChange: (value: HeroShape) => void }) {
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-3" data-testid="hero-frame-shape-grid">
    {heroFrameShapes.map((shape) => <button
      key={shape.value}
      type="button"
      aria-pressed={shape.value === value}
      onClick={() => onChange(shape.value)}
      className={cx('rounded-xl border p-2 text-left transition-colors', shape.value === value ? 'border-select bg-select-soft' : 'border-line hover:border-[#CDD1D7]')}>
      <span className="block h-9 overflow-hidden rounded-md bg-[#EEF0F3] p-1">
        <span className="block h-full bg-[#9AA1AB]" style={previewStyle(shape.value)} />
      </span>
      <span className="mt-1 block text-[11.5px] font-medium text-ink">{shape.label}</span>
    </button>)}
  </div>;
}
