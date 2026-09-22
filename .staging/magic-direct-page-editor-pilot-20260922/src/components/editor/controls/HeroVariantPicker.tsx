import React from 'react';
import { cx } from '../../../utils/cx';
import type { HeroVariant } from '../../../types/editor';

interface HeroVariantPickerProps {
  value: HeroVariant;
  onChange: (value: HeroVariant) => void;
}

export const heroVariants: {value: HeroVariant;label: string;hint: string;}[] = [
{ value: 'simple', label: 'Simple', hint: 'Sin imagen, color de fondo' },
{ value: 'centered', label: 'Centrada', hint: 'Banda de imagen + avatar' },
{ value: 'split', label: 'Dividida', hint: 'Texto e imagen lado a lado' },
{ value: 'image', label: 'Imagen', hint: 'Imagen a sangre con texto' }];


export function HeroVariantThumb({ variant }: {variant: HeroVariant;}) {
  const bar = 'rounded-full bg-[#9AA1AB]';
  if (variant === 'simple')
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-[#EEF0F3]">
        <span className="h-4 w-4 rounded-full bg-[#9AA1AB]" />
        <span className={cx(bar, 'h-1.5 w-12')} />
        <span className={cx(bar, 'h-1 w-8 opacity-60')} />
      </div>);

  if (variant === 'centered')
  return (
    <div className="flex h-full flex-col items-center bg-white">
        <span className="h-7 w-full rounded-b-[50%] bg-[#C9CED6]" />
        <span className="-mt-2.5 h-5 w-5 rounded-full border-2 border-white bg-[#9AA1AB]" />
        <span className={cx(bar, 'mt-1.5 h-1.5 w-12')} />
      </div>);

  if (variant === 'split')
  return (
    <div className="grid h-full grid-cols-2 items-center gap-2 bg-white p-2">
        <div className="space-y-1.5">
          <span className={cx(bar, 'block h-1.5 w-full')} />
          <span className={cx(bar, 'block h-1 w-3/4 opacity-60')} />
          <span className="block h-2.5 w-8 rounded-full bg-[#15171C]" />
        </div>
        <span className="h-full rounded-t-full bg-[#C9CED6]" />
      </div>);

  return (
    <div className="relative flex h-full flex-col justify-end gap-1 bg-[#6B7079] p-2">
      <span className="h-1.5 w-14 rounded-full bg-white" />
      <span className="h-1 w-9 rounded-full bg-white/60" />
    </div>);

}

export function HeroVariantPicker({ value, onChange }: HeroVariantPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {heroVariants.map((v) => {
        const active = v.value === value;
        return (
          <button
            key={v.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(v.value)}
            className={cx('rounded-xl border p-1.5 text-left transition-colors duration-150', active ? 'border-select bg-select-soft' : 'border-line hover:border-[#CDD1D7]')}>
            
            <div className="h-16 overflow-hidden rounded-lg border border-black/5">
              <HeroVariantThumb variant={v.value} />
            </div>
            <p className="mt-1.5 px-0.5 text-[12.5px] font-semibold text-ink">{v.label}</p>
            <p className="px-0.5 text-[11px] leading-snug text-mute">{v.hint}</p>
          </button>);

      })}
    </div>);

}