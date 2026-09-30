import React from 'react';
import { cx } from '../../../utils/cx';

export const separatorStyles = [
  ['minimal', 'Minimal'], ['editorial', 'Editorial'], ['luxury', 'Luxury'], ['double', 'Doble'],
  ['dot-center', 'Punto central'], ['fade', 'Desvanecido'], ['organic', 'Orgánico'], ['spacing-only', 'Solo espacio'],
] as const;
export type SeparatorStyle = (typeof separatorStyles)[number][0];

function Preview({ style }: { style: SeparatorStyle }) {
  if (style === 'spacing-only') return <span className="block h-5" />;
  if (style === 'luxury') return <span className="relative block h-4"><span className="absolute inset-x-0 top-1/2 border-t border-current" /><span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-current bg-white" /></span>;
  if (style === 'double') return <span className="block space-y-1"><span className="block border-t border-current" /><span className="block border-t border-current" /></span>;
  if (style === 'dot-center') return <span className="relative block h-4"><span className="absolute inset-x-0 top-1/2 border-t border-current" /><span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2 ring-white" /></span>;
  if (style === 'fade') return <span className="block border-t border-current [mask-image:linear-gradient(to_right,transparent,black_25%,black_75%,transparent)]" />;
  if (style === 'organic') return <span className="block h-3 rounded-[50%] border-t border-current" />;
  return <span className={cx('block border-t border-current', style === 'editorial' && 'mx-auto w-3/4')} />;
}

export function SeparatorStylePicker({ value, onChange }: { value: SeparatorStyle; onChange: (value: SeparatorStyle) => void }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="separator-style-picker">
    {separatorStyles.map(([id, label]) => <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)} className={cx('rounded-xl border p-2 text-left transition-colors', value === id ? 'border-select bg-select-soft' : 'border-line bg-white hover:border-[#CDD1D7]')}>
      <span className="block rounded-md bg-canvas px-2 py-2 text-mute"><Preview style={id} /></span>
      <span className="mt-1 block text-[11.5px] font-medium text-ink">{label}</span>
    </button>)}
  </div>;
}
