import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';

export type MediaShape = 'square' | 'rounded' | 'circle' | 'oval' | 'arch' | 'bleed';

const options: { value: MediaShape; label: string; className: string }[] = [
  { value: 'square', label: 'Cuadrada', className: 'h-8 w-8 rounded-none' },
  { value: 'rounded', label: 'Redondeada', className: 'h-8 w-8 rounded-lg' },
  { value: 'circle', label: 'Círculo', className: 'h-8 w-8 rounded-full' },
  { value: 'oval', label: 'Óvalo', className: 'h-9 w-7 rounded-[50%]' },
  { value: 'arch', label: 'Arco', className: 'h-9 w-7 rounded-t-full rounded-b-md' },
  { value: 'bleed', label: 'A sangre', className: 'h-7 w-10 rounded-sm' }
];

export function MediaShapePicker({ value, onChange, shapes = options.map((option) => option.value) }: { value: MediaShape; onChange: (value: MediaShape) => void; shapes?: MediaShape[] }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Forma de imagen">
    {options.filter((option) => shapes.includes(option.value)).map((option) => {
      const active = value === option.value;
      return <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onChange(option.value)}
        className={cx('relative flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border px-2 transition-colors', active ? 'border-select bg-select-soft text-select' : 'border-line bg-white text-ink hover:border-[#CDD1D7]')}>
        <span className={cx('border border-current/40 bg-current/20', option.className)} aria-hidden="true" />
        <span className="text-[11.5px] font-medium">{option.label}</span>
        {active && <CheckIcon className="absolute h-3.5 w-3.5 translate-x-7 -translate-y-6" aria-hidden="true" />}
      </button>;
    })}
  </div>;
}
