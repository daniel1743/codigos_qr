import React from 'react';
import { cx } from '../../../utils/cx';
import type { CtaVariant } from '../EditableCTA';

interface CtaStylePickerProps {
  value: CtaVariant;
  onChange: (value: CtaVariant) => void;
}

const styles: {value: CtaVariant;label: string;preview: string;}[] = [
{ value: 'solid', label: 'Sólido', preview: 'bg-ink text-white' },
{ value: 'outline', label: 'Contorno', preview: 'border border-ink text-ink' },
{ value: 'soft', label: 'Suave', preview: 'bg-[#EEF0F3] text-ink' }];


export function CtaStylePicker({ value, onChange }: CtaStylePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {styles.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(s.value)}
            className={cx('rounded-xl border p-2 transition-colors duration-150', active ? 'border-select bg-select-soft' : 'border-line hover:border-[#CDD1D7]')}>
            
            <span className={cx('flex h-8 items-center justify-center rounded-full text-[11px] font-semibold', s.preview)}>Botón</span>
            <span className="mt-1.5 block text-[12px] font-medium text-ink">{s.label}</span>
          </button>);

      })}
    </div>);

}