import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangleIcon, CheckCircle2Icon } from 'lucide-react';
import { cx } from '../../../utils/cx';
import { normalizeDestination } from '../../../utils/buttonGroup';

interface LinkEditorProps {
  value: string;
  onChange: (href: string) => void;
  /** Optional line above the field ("Este enlace solo pertenece a este botón."). */
  helper?: string | undefined;
  /** When provided, an "abrir en nueva pestaña" switch is rendered. */
  newTab?: string | undefined;
  onNewTabChange?: (value: string) => void;
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

export function LinkEditor({ value, onChange, helper, newTab, onNewTabChange }: LinkEditorProps) {
  const [draft, setDraft] = useState(value);
  const [type, setType] = useState(detect(value));
  useEffect(() => {
    setDraft(value);
    setType(detect(value));
  }, [value]);

  const destination = normalizeDestination(draft);
  const dirty = draft.trim() !== (value ?? '').trim();
  const canSave = destination.valid && dirty;

  const save = () => {
    if (!destination.valid) return;
    onChange(destination.href);
    toast.success('Enlace actualizado');
  };

  return (
    <div className="space-y-3">
      {helper && <p className="text-[12px] leading-snug text-mute">{helper}</p>}
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
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1',
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
          aria-invalid={draft.length > 0 && !destination.valid}
          className={cx(
            'h-11 w-full rounded-xl border bg-white px-3 text-[14px] text-ink outline-none transition-shadow duration-150 focus:ring-2 focus:ring-select/20',
            destination.valid || draft.length === 0 ? 'border-line focus:border-select' : 'border-[#E4A38A] focus:border-[#C2410C]'
          )} />
        
      </label>
      <p
        role="status"
        className={cx('flex items-start gap-1.5 text-[11.5px] leading-snug', destination.valid ? 'text-[#15803D]' : 'text-[#C2410C]')}>
        {destination.valid ?
        <CheckCircle2Icon className="mt-px h-3.5 w-3.5 shrink-0" /> :
        <AlertTriangleIcon className="mt-px h-3.5 w-3.5 shrink-0" />}
        <span>{destination.message}</span>
      </p>
      {onNewTabChange &&
      <label className="flex items-center gap-2.5 text-[12.5px] font-medium text-ink">
          <input
          type="checkbox"
          checked={newTab !== 'off'}
          onChange={(e) => onNewTabChange(e.target.checked ? 'on' : 'off')}
          className="h-4 w-4 rounded border-line text-select focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1" />
          Abrir en una pestaña nueva
        </label>}
      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="h-10 w-full rounded-xl bg-ink text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40">
        
        {destination.valid ? 'Guardar enlace' : 'Revisa el destino para guardar'}
      </button>
    </div>);

}
