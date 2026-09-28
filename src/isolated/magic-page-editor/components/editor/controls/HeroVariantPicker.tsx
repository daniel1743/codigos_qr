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
{ value: 'bleed', label: 'Lateral a sangre', hint: 'Media pantalla de imagen' },
{ value: 'editorialCenter', label: 'Editorial centrada', hint: 'Retrato, aire y tipografía protagonista' },
{ value: 'splitHorizontal', label: 'Split horizontal', hint: 'Imagen panorámica sobre contenido' },
{ value: 'splitVertical', label: 'Split vertical', hint: 'Dos planos verticales contrastados' },
{ value: 'fullBleed', label: 'Foto full bleed', hint: 'Fotografía total y contenido al frente' },
{ value: 'photoCard', label: 'Tarjeta sobre foto', hint: 'Ficha elevada en primer plano' },
{ value: 'avatarBand', label: 'Banda + avatar', hint: 'Identidad compacta y reconocible' },
{ value: 'photoGrid', label: 'Mosaico fotográfico', hint: 'Retícula visual de cuatro momentos' },
{ value: 'quote', label: 'Portada con quote', hint: 'La frase editorial toma protagonismo' },
{ value: 'collage', label: 'Collage', hint: 'Capas fotográficas con ritmo orgánico' },
{ value: 'lowerBlock', label: 'Bloque inferior', hint: 'Imagen superior y ficha anclada' },
{ value: 'galleryFrame', label: 'Marco de galería', hint: 'Fotografía contenida con aire de museo' },
{ value: 'sideBleed', label: 'Lateral editorial', hint: 'Imagen lateral y texto de revista' },
{ value: 'magazine', label: 'Magazine', hint: 'Titular grande y composición impresa' },
{ value: 'elegantOverlay', label: 'Superposición', hint: 'Capas suaves sobre imagen protagonista' },
{ value: 'backgroundFade', label: 'Transición al fondo', hint: 'La imagen se funde con la página' },
{ value: 'minimalPremium', label: 'Minimal premium', hint: 'Máximo espacio y detalle preciso' },
{ value: 'sideInfo', label: 'Información lateral', hint: 'Datos ordenados en columna auxiliar' },
{ value: 'descriptionCard', label: 'Tarjeta descriptiva', hint: 'Narrativa contenida junto a la imagen' },
{ value: 'cinematic', label: 'Cinematográfica', hint: 'Formato panorámico de alto impacto' },
{ value: 'brandIdentity', label: 'Identidad de marca', hint: 'Firma, avatar y mensaje como sistema' }];


const img = 'bg-[#C9CED6]';
const bar = 'rounded-full bg-[#9AA1AB]';

export function HeroVariantThumb({ variant }: {variant: HeroVariant;}) {
  const index = heroVariants.findIndex((item) => item.value === variant);
  if (index >= 10) {
    const mode = index - 10;
    return <div className="relative h-full overflow-hidden bg-[#EEF0F3]">
      <span className={cx(img, 'absolute',
        mode === 0 && 'inset-x-5 top-2 h-7', mode === 1 && 'inset-x-1 top-1 h-7', mode === 2 && 'bottom-0 left-0 top-0 w-1/2', mode === 3 && 'inset-0', mode === 4 && 'inset-1',
        mode === 5 && 'inset-x-0 top-0 h-6', mode === 6 && 'bottom-1 left-1 top-1 w-3/5', mode === 7 && 'bottom-3 left-[18%] right-[18%] top-3', mode === 8 && 'left-1 top-1 h-9 w-7 rotate-[-4deg]', mode === 9 && 'inset-x-1 top-1 h-7',
        mode === 10 && 'inset-2 border-4 border-white', mode === 11 && 'bottom-0 left-0 top-0 w-3/5', mode === 12 && 'bottom-1 right-1 top-1 w-3/5', mode === 13 && 'inset-1', mode === 14 && 'inset-x-0 top-0 h-10',
        mode === 15 && 'left-2 top-2 h-10 w-7', mode === 16 && 'bottom-0 left-5 top-0 w-1/2', mode === 17 && 'bottom-1 left-1 top-1 w-3/5 rounded-lg', mode === 18 && 'inset-x-0 top-2 h-9', mode === 19 && 'right-2 top-1 h-10 w-10 rounded-full')} />
      {mode === 6 && <><span className={cx(img, 'absolute right-1 top-1 h-4 w-8')} /><span className={cx(img, 'absolute bottom-1 right-1 h-4 w-8')} /></>}
      {mode === 8 && <span className={cx(img, 'absolute right-2 top-2 h-8 w-7 rotate-[5deg] shadow')} />}
      <span className={cx('absolute flex flex-col gap-1', [0,5,6,9,10,14,18].includes(mode) ? 'bottom-2 left-1/2 -translate-x-1/2 items-center' : mode % 2 ? 'bottom-2 left-2' : 'bottom-2 right-2 items-end')}>
        <span className={cx(bar, 'block h-1.5', mode === 12 ? 'w-16' : 'w-12', [3,7,13,14,18].includes(mode) && 'bg-white')} />
        <span className={cx(bar, 'block h-1 w-8 opacity-60', [3,7,13,14,18].includes(mode) && 'bg-white')} />
      </span>
    </div>;
  }
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
    <div className="grid grid-cols-2 gap-2" data-testid="hero-variant-grid">
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