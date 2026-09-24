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
{ value: 'image', label: 'Imagen', hint: 'Imagen a sangre con texto' },
{ value: 'arch', label: 'Arco', hint: 'Imagen en ventana de arco' },
{ value: 'floating', label: 'Tarjeta flotante', hint: 'Texto en tarjeta sobre la foto' },
{ value: 'banner', label: 'Banda + perfil', hint: 'Banner y avatar alineado' },
{ value: 'mosaic', label: 'Mosaico', hint: 'Texto y collage de 3 fotos' },
{ value: 'frame', label: 'Marco', hint: 'Imagen enmarcada con pie' },
{ value: 'bleed', label: 'Lateral a sangre', hint: 'Media pantalla de imagen' }];


const img = 'bg-[#C9CED6]';
const bar = 'rounded-full bg-[#9AA1AB]';

export function HeroVariantThumb({ variant }: {variant: HeroVariant;}) {
  switch (variant) {
    case 'simple':
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-[#EEF0F3]">
          <span className="h-4 w-4 rounded-full bg-[#9AA1AB]" />
          <span className={cx(bar, 'h-1.5 w-12')} />
          <span className={cx(bar, 'h-1 w-8 opacity-60')} />
        </div>);

    case 'centered':
      return (
        <div className="flex h-full flex-col items-center bg-white">
          <span className={cx(img, 'h-7 w-full rounded-b-[50%]')} />
          <span className="-mt-2.5 h-5 w-5 rounded-full border-2 border-white bg-[#9AA1AB]" />
          <span className={cx(bar, 'mt-1.5 h-1.5 w-12')} />
        </div>);

    case 'split':
      return (
        <div className="grid h-full grid-cols-2 items-center gap-2 bg-white p-2">
          <div className="space-y-1.5">
            <span className={cx(bar, 'block h-1.5 w-full')} />
            <span className={cx(bar, 'block h-1 w-3/4 opacity-60')} />
            <span className="block h-2.5 w-8 rounded-full bg-[#15171C]" />
          </div>
          <span className={cx(img, 'h-full rounded-t-full')} />
        </div>);

    case 'image':
      return (
        <div className="relative flex h-full flex-col justify-end gap-1 bg-[#6B7079] p-2">
          <span className="h-1.5 w-14 rounded-full bg-white" />
          <span className="h-1 w-9 rounded-full bg-white/60" />
        </div>);

    case 'arch':
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1 bg-white">
          <span className={cx(img, 'h-9 w-8 rounded-t-full rounded-b-sm')} />
          <span className={cx(bar, 'h-1.5 w-10')} />
        </div>);

    case 'floating':
      return (
        <div className="relative flex h-full items-end justify-center bg-[#9AA1AB] p-1.5">
          <span className="flex h-7 w-20 flex-col items-center justify-center gap-1 rounded-md bg-white">
            <span className={cx(bar, 'h-1 w-10')} />
            <span className={cx(bar, 'h-1 w-6 opacity-60')} />
          </span>
        </div>);

    case 'banner':
      return (
        <div className="flex h-full flex-col bg-white p-1.5">
          <span className={cx(img, 'h-6 w-full rounded-md')} />
          <div className="flex items-end gap-1.5 px-1.5">
            <span className="-mt-2.5 h-5 w-5 shrink-0 rounded-full border-2 border-white bg-[#9AA1AB]" />
            <span className={cx(bar, 'mb-0.5 h-1.5 w-12')} />
          </div>
        </div>);

    case 'mosaic':
      return (
        <div className="grid h-full grid-cols-2 items-center gap-2 bg-white p-2">
          <div className="space-y-1.5">
            <span className={cx(bar, 'block h-1.5 w-full')} />
            <span className={cx(bar, 'block h-1 w-2/3 opacity-60')} />
          </div>
          <div className="grid h-full grid-cols-[1.4fr_1fr] grid-rows-2 gap-0.5">
            <span className={cx(img, 'row-span-2 rounded-sm')} />
            <span className={cx(img, 'rounded-sm')} />
            <span className={cx(img, 'rounded-sm')} />
          </div>
        </div>);

    case 'frame':
      return (
        <div className="h-full bg-white p-1.5">
          <div className="flex h-full flex-col rounded-md bg-[#EEF0F3] p-1">
            <span className={cx(img, 'h-7 w-full rounded-sm')} />
            <span className={cx(bar, 'mt-1.5 h-1.5 w-12')} />
          </div>
        </div>);

    default:
      return (
        <div className="grid h-full grid-cols-2 bg-white">
          <span className={cx(img, 'h-full rounded-r-[14px]')} />
          <div className="flex flex-col justify-center gap-1.5 px-2">
            <span className={cx(bar, 'h-1.5 w-full')} />
            <span className={cx(bar, 'h-1 w-2/3 opacity-60')} />
          </div>
        </div>);

  }
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