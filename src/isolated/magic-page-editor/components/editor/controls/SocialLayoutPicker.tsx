import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';
import type { SocialLayout } from '../EditableSocial';

const layouts: { value: SocialLayout; label: string }[] = [
  { value: 'row', label: 'Fila' },
  { value: 'column', label: 'Columna' },
  { value: 'arc', label: 'Arco' },
  { value: 'cluster', label: 'Grupo' }
];

function Preview({ value }: { value: SocialLayout }) {
  const dots = [0, 1, 2, 3].map((i) => <span key={i} className="h-3 w-3 rounded-full border border-current bg-current/20" />);
  if (value === 'column') return <span className="flex flex-col gap-1">{dots}</span>;
  if (value === 'arc') return <span className="flex items-end gap-1">{dots.map((dot, i) => <span key={i} style={{ transform: `translateY(${Math.abs(1.5 - i) * -4}px)` }}>{dot}</span>)}</span>;
  if (value === 'cluster') return <span className="relative h-8 w-12">{dots.map((dot, i) => <span key={i} className="absolute" style={{ left: `${(i % 2) * 18 + 6}px`, top: `${Math.floor(i / 2) * 14}px` }}>{dot}</span>)}</span>;
  return <span className="flex gap-1">{dots}</span>;
}

export function SocialLayoutPicker({ value, onChange }: { value: SocialLayout; onChange: (value: SocialLayout) => void }) {
  return <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Distribución social">
    {layouts.map((layout) => {
      const active = value === layout.value;
      return <button key={layout.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(layout.value)} className={cx('relative flex min-h-[70px] flex-col items-center justify-center gap-2 rounded-xl border transition-colors', active ? 'border-select bg-select-soft text-select' : 'border-line bg-white text-ink hover:border-[#CDD1D7]')}>
        <Preview value={layout.value} />
        <span className="text-[11.5px] font-medium">{layout.label}</span>
        {active && <CheckIcon className="absolute right-2 top-2 h-3.5 w-3.5" aria-hidden="true" />}
      </button>;
    })}
  </div>;
}
