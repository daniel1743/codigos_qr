import React from 'react';
import { cx } from '../../../utils/cx';
import { heroShapeAppliesTo, type HeroShape } from '../../blocks/HeroFrame';

/** All nine silhouettes. The list and its order are a tested contract — see m2_2HeroFrameShapes. */
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

export function HeroFrameShapePicker({
  value,
  onChange,
  variant,
}: {
  value: HeroShape;
  onChange: (value: HeroShape) => void;
  /** Live hero variant. Used only to flag options that cannot draw here — never to hide them. */
  variant?: string | null;
}) {
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-3" data-testid="hero-frame-shape-grid">
    {heroFrameShapes.map((shape) => {
      // All nine stay selectable — that is the contract the tests pin. The flag
      // only tells the user when the current variant ignores the silhouette, so
      // the option stops being a silent no-op.
      const applies = heroShapeAppliesTo(shape.value, variant);
      const active = shape.value === value;
      return <button
        key={shape.value}
        type="button"
        aria-pressed={active}
        data-applies={applies}
        title={applies ? undefined : 'Esta variante no usa silueta: la forma no cambia el resultado.'}
        onClick={() => onChange(shape.value)}
        className={cx('rounded-xl border p-2 text-left transition-colors', active ? 'border-select bg-select-soft' : 'border-line hover:border-[#CDD1D7]')}>
        <span className={cx('block h-9 overflow-hidden rounded-md bg-[#EEF0F3] p-1', !applies && 'opacity-40')}>
          <span className="block h-full bg-[#9AA1AB]" style={previewStyle(shape.value)} />
        </span>
        <span className={cx('mt-1 block text-[11.5px] font-medium text-ink', !applies && 'text-mute')}>{shape.label}</span>
      </button>;
    })}
  </div>;
}
