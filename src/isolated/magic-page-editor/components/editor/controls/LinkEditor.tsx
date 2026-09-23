import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cx } from '../../../utils/cx';

interface LinkEditorProps {
  value: string;
  onChange: (href: string) => void;
}

const types = [
{ id: 'web', label: 'Web', prefix: 'https://' },
{ id: 'whatsapp', label: 'WhatsApp', prefix: 'https://wa.me/' },
{ id: 'email', label: 'Email', prefix: 'mailto:' },
{ id: 'phone', label: 'Teléfono', prefix: 'tel:' }];


function detect(href: string): string {
  if (href.startsWith('https://wa.me/')) return 'whatsapp';
  if (href.startsWith('mailto:')) return 'email';
  if (href.startsWith('tel:')) return 'phone';
  return 'web';
}

export function LinkEditor({ value, onChange }: LinkEditorProps) {
  const [draft, setDraft] = useState(value);
  const [type, setType] = useState(detect(value));
  useEffect(() => {
    setDraft(value);
    setType(detect(value));
  }, [value]);

  const save = () => {
    onChange(draft.trim());
    toast.success('Enlace actualizado');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {types.map((t) =>
        <button
          key={t.id}
          type="button"
          onClick={() => {
            setType(t.id);
            setDraft(t.prefix);
          }}
          className={cx(
            'h-8 rounded-full border px-3 text-[12px] font-medium transition-colors duration-150',
            type === t.id ? 'border-select bg-select-soft text-select' : 'border-line text-mute hover:text-ink'
          )}>
          
            {t.label}
          </button>
        )}
      </div>
      <label className="block">
        <span className="sr-only">Destino del enlace</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
          placeholder="https://"
          className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink outline-none transition-shadow duration-150 focus:border-select focus:ring-2 focus:ring-select/20" />
        
      </label>
      <button
        type="button"
        onClick={save}
        className="h-10 w-full rounded-xl bg-ink text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90">
        
        Guardar enlace
      </button>
    </div>);

}