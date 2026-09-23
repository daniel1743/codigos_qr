import React, { useRef, useState } from 'react';
import { CheckIcon, UploadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { imageLibrary } from '../../../data/images';
import { cx } from '../../../utils/cx';

interface ImagePickerProps {
  value?: string;
  onChange: (src: string) => void;
  onUpload?: (file: File) => Promise<string>;
}

export function ImagePicker({ value, onChange, onUpload }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!onUpload) return;
    setUploading(true);
    try {
      onChange(await onUpload(file));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      <button
        type="button"
        onClick={() => onUpload ? inputRef.current?.click() : toast('Abriendo tus archivos…', { description: 'En este prototipo, elige una imagen de la biblioteca.' })}
        disabled={uploading}
        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-[11px] font-medium text-mute transition-colors duration-150 hover:border-select hover:text-select">
        
        <UploadIcon className="h-4 w-4" />
        {uploading ? 'Subiendo…' : 'Subir'}
      </button>
      {onUpload && <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void upload(file);
      }} />}
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
