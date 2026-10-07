import React, { useRef, useState } from 'react';
import { CheckIcon, UploadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { imageLibrary } from '../../../data/images';
import { cx } from '../../../utils/cx';

interface ImagePickerProps {
  value?: string | undefined;
  onChange: (src: string) => void;
  onUpload?: ((file: File) => Promise<string>) | undefined;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function ImagePicker({ value, onChange, onUpload }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen válida.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('La imagen no puede superar los 10 MB.');
      return;
    }
    if (!onUpload) {
      toast.error('La subida de imágenes no está disponible en este editor.');
      return;
    }

    setUploading(true);
    try {
      const src = await onUpload(file);
      onChange(src);
      toast.success('Imagen subida correctamente.');
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-[11px] font-medium text-mute transition-colors duration-150 hover:border-select hover:text-select">
        {uploading ? <span className="animate-pulse">Subiendo…</span> : <>
          <UploadIcon className="h-4 w-4" />
          Subir
        </>}
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
      {imageLibrary.map((src) => {
        const active = src === value;
        return (
          <button
            key={src}
            type="button"
            aria-label="Usar esta imagen"
            aria-pressed={active}
            onClick={() => onChange(src)}
            className={cx('relative aspect-square overflow-hidden rounded-xl ring-offset-2 transition-shadow duration-150', active ? 'ring-2 ring-select' : 'hover:ring-2 hover:ring-line')}>
            
            <img src={src} alt="" className="h-full w-full object-cover" />
            {active &&
            <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-select text-white">
                <CheckIcon className="h-3 w-3" strokeWidth={3} />
              </span>
            }
          </button>);

      })}
    </div>);

}
