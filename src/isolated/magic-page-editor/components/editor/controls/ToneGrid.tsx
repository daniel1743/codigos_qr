import React, { useState } from 'react';
import { CheckIcon, PlusIcon } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { cx } from '../../../utils/cx';
import type { SurfaceTone } from '../../../types/editor';
import { normalizeHex } from './SwatchRow';

interface ToneGridProps {
  tones: SurfaceTone[];
  value?: string;
  onChange: (id: string) => void;
  allowDefault?: boolean;
}

export function ToneGrid({ tones, value, onChange, allowDefault = true }: ToneGridProps) {
  const items = allowDefault ? [{ id: '', label: 'Heredar', color: 'transparent', fg: '#6B7079' } as SurfaceTone, ...tones] : tones;
  const isCustomHex = value && !items.some(t => t.id === value) && value.startsWith('#');
  
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(isCustomHex ? value : '#000000');
  const [error, setError] = useState(false);

  const handleLiveChange = (raw: string) => { const hex = raw.toUpperCase(); setDraft(hex); setError(false); const valid = normalizeHex(hex); if (valid) onChange(valid); };
  const cancel = () => { setOpen(false); };
  const applyCustom = () => {
    const normalized = normalizeHex(draft);
    if (!normalized) { setError(true); return; }
    onChange(normalized);
    setOpen(false);
    setError(false);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((t) => {
        const active = (value ?? '') === t.id;
        return (
          <button
            key={t.id || 'default'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.id)}
            className={cx(
              'flex flex-col items-start gap-2 rounded-xl border p-2 text-left transition-colors duration-150',
              active ? 'border-select bg-select-soft' : 'border-line hover:border-[#CDD1D7]'
            )}>
            
            <span
              className={cx('grid h-9 w-full place-items-center rounded-lg border border-black/10', !t.id && 'border-dashed border-[#B8BDC5] bg-white')}
              style={t.id ? { background: t.color, color: t.fg } : undefined}>
              
              {active && <CheckIcon className="h-4 w-4" strokeWidth={2.5} />}
            </span>
            <span className="text-[12px] font-medium text-ink truncate w-full">{t.label}</span>
          </button>);
      })}

      <Popover.Root open={open} onOpenChange={(isOpen) => { if (!isOpen && value && normalizeHex(draft) !== normalizeHex(value) && isCustomHex) { onChange(value); } setOpen(isOpen); }}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-pressed={!!isCustomHex}
            onClick={() => { setDraft(isCustomHex ? value : '#000000'); setError(false); setOpen(true); }}
            className={cx(
              'flex flex-col items-start gap-2 rounded-xl border p-2 text-left transition-colors duration-150',
              isCustomHex ? 'border-select bg-select-soft' : 'border-line hover:border-[#CDD1D7]'
            )}>
            <span
              className="grid h-9 w-full place-items-center rounded-lg border border-black/10"
              style={{ background: isCustomHex ? value : '#F3F4F6', color: isCustomHex ? '#ffffff' : '#6B7079' }}>
              {isCustomHex ? <CheckIcon className="h-4 w-4 drop-shadow-md" strokeWidth={2.5} /> : <PlusIcon className="h-4 w-4" />}
            </span>
            <span className="text-[12px] font-medium text-ink truncate w-full">Personalizado</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="bottom" align="end" sideOffset={8} className="z-50 w-64 rounded-2xl border border-line bg-white p-3 shadow-xl">
            <div className="mb-3 flex items-center gap-3">
              <input
                aria-label="Selector de color"
                type="color"
                value={normalizeHex(draft) ?? '#000000'}
                onChange={(event) => handleLiveChange(event.target.value)}
                className="h-12 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              />
              <span className="text-[12px] text-mute">Vista previa</span>
              <span className="ml-auto h-7 w-7 rounded-full border border-black/10" style={{ background: normalizeHex(draft) ?? '#000000' }} aria-label={`Color actual ${draft}`} />
            </div>
            <label className="block text-[12px] font-medium text-ink" htmlFor="custom-hex-color">HEX</label>
            <input
              id="custom-hex-color"
              aria-label="Color HEX"
              value={draft}
              onChange={(event) => handleLiveChange(event.target.value)}
              placeholder="#0B1F3A"
              inputMode="text"
              className="mt-1 h-9 w-full rounded-lg border border-line px-2.5 text-[13px] text-ink outline-none focus:border-select focus:ring-2 focus:ring-select/20"
            />
            {error && <p className="mt-1 text-[11px] text-red-600">Introduce un color HEX válido.</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={cancel} className="rounded-lg px-2.5 py-1.5 text-[12px] text-mute hover:text-ink">Cerrar</button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

    </div>);
}