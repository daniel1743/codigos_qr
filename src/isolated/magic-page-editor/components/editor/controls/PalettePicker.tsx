import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';
import { visualPalettes } from '../../../data/visualPresets';

export function PalettePicker({ value, onChange }: { value?: string | undefined; onChange: (value: string) => void }) {
  return <div className="grid grid-cols-2 gap-2">
    {visualPalettes.map((palette) => <button key={palette.id} type="button" aria-pressed={value === palette.id} onClick={() => onChange(palette.id)} className={cx('rounded-xl border p-2 text-left', value === palette.id ? 'border-select bg-select-soft' : 'border-line')}>
      <span className="mb-2 flex h-8 overflow-hidden rounded-lg">
        {palette.swatches.slice(0, 4).map((color) => <span key={color} className="flex-1" style={{ background: color }} />)}
      </span>
      <span className="flex items-center justify-between text-[12px] font-medium text-ink">{palette.label}{value === palette.id && <CheckIcon className="h-3.5 w-3.5 text-select" />}</span>
    </button>)}
  </div>;
}
