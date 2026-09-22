import React from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';

interface SizeStepperProps {
  value: number;
  onChange: (value: number) => void;
  large?: boolean;
  min?: number;
  max?: number;
}

export function SizeStepper({ value, onChange, large = false, min = 10, max = 140 }: SizeStepperProps) {
  const step = value >= 40 ? 4 : value >= 24 ? 2 : 1;
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  const btn = cx(
    'grid place-items-center rounded-lg text-ink transition-colors duration-150 hover:bg-[#E8EAEE] disabled:opacity-40',
    large ? 'h-12 w-14' : 'h-7 w-7'
  );
  return (
    <div className={cx('flex items-center rounded-xl bg-[#F2F3F5]', large ? 'justify-between p-1.5' : 'p-0.5')} aria-label="Tamaño del texto">
      <button type="button" className={btn} onClick={() => set(value - step)} disabled={value <= min} aria-label="Reducir tamaño">
        <MinusIcon className="h-3.5 w-3.5" />
      </button>
      <span className={cx('text-center font-medium tabular-nums text-ink', large ? 'text-[20px]' : 'w-8 text-[12.5px]')}>
        {value}
        {large && <span className="ml-1 text-[13px] text-mute">px</span>}
      </span>
      <button type="button" className={btn} onClick={() => set(value + step)} disabled={value >= max} aria-label="Aumentar tamaño">
        <PlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>);

}