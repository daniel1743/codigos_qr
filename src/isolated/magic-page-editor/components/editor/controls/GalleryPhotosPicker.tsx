import React, { useRef, useState } from 'react';
import { UploadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { imageLibrary } from '../../../data/images';
import { cx } from '../../../utils/cx';

interface GalleryPhotosPickerProps {
  value: string[];
  onChange: (items: string[]) => void;
  onUpload?: (file: File) => Promise<string>;
}

export function GalleryPhotosPicker({ value, onChange, onUpload }: GalleryPhotosPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen válida.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede superar los 10 MB.');
      return;
    }
    if (!onUpload) {
      toast.error('La subida de imágenes no está disponible en este editor.');
      return;
    }
    if (value.length >= 8) {
      toast.error('La galería admite hasta 8 fotos.');
      return;
    }

    setUploading(true);
    try {
      const src = await onUpload(file);
      onChange([...value, src]);
      toast.success('Foto añadida a la galería.');
    } catch (error) {
      console.error('Gallery image upload failed:', error);
      toast.error('No se pudo subir la foto.');
    } finally {
      setUploading(false);
    }
  };

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
        {onUpload ? <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || value.length >= 8}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-[11px] font-medium text-mute transition-colors duration-150 hover:border-select hover:text-select disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UploadIcon className="h-4 w-4" />
            {uploading ? 'Subiendo…' : 'Subir'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void upload(file);
            }}
          />
        </> : null}
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
