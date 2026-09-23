import React from 'react';
import { cx } from '../../../utils/cx';

interface PositionPadProps {
  value: string;
  onChange: (value: string) => void;
}

const xs = ['left', 'center', 'right'];
const ys = ['top', 'center', 'bottom'];

export function PositionPad({ value, onChange }: PositionPadProps) {
  const current = value === 'center' ? 'center center' : value;
  return (
    <div className="flex items-center gap-4">
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#F2F3F5] p-1.5" role="radiogroup" aria-label="Punto de enfoque">
        {ys.map((y) =>
        xs.map((x) => {
          const v = `${x} ${y}`;
          const active = v === current;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Enfocar ${x} ${y}`}
              onClick={() => onChange(v)}
              className={cx('grid h-10 w-10 place-items-center rounded-lg transition-colors duration-150', active ? 'bg-white shadow-sm' : 'hover:bg-white/60')}>
              
                <span className={cx('rounded-full transition-all duration-150', active ? 'h-2.5 w-2.5 bg-select' : 'h-1.5 w-1.5 bg-[#A3A8B0]')} />
              </button>);

        })
        )}
      </div>
      <p className="text-[12px] leading-snug text-mute">Elige qué parte de la imagen debe quedar siempre visible.</p>
    </div>);

}