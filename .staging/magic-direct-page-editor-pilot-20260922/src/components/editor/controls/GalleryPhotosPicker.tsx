import React from 'react';
import { imageLibrary } from '../../../data/images';
import { cx } from '../../../utils/cx';

interface GalleryPhotosPickerProps {
  value: string[];
  onChange: (items: string[]) => void;
}

export function GalleryPhotosPicker({ value, onChange }: GalleryPhotosPickerProps) {
  const toggle = (src: string) => {
    if (value.includes(src)) {
      if (value.length > 1) onChange(value.filter((s) => s !== src));
      return;
    }
    if (value.length < 8) onChange([...value, src]);
  };
  return (
    <div>
      <p className="mb-2.5 text-[12px] text-mute">{value.length} fotos · el orden sigue tu selección</p>
      <div className="grid grid-cols-4 gap-2">
        {imageLibrary.map((src) => {
          const index = value.indexOf(src);
          const active = index >= 0;
          return (
            <button
              key={src}
              type="button"
              aria-pressed={active}
              aria-label={active ? `Quitar foto ${index + 1}` : 'Añadir foto'}
              onClick={() => toggle(src)}
              className={cx('relative aspect-square overflow-hidden rounded-xl ring-offset-2 transition-shadow duration-150', active ? 'ring-2 ring-select' : 'opacity-80 hover:opacity-100')}>
              
              <img src={src} alt="" className="h-full w-full object-cover" />
              {active &&
              <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-select text-[11px] font-bold text-white">
                  {index + 1}
                </span>
              }
            </button>);

        })}
      </div>
    </div>);

}