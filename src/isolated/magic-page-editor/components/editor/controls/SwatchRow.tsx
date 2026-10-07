import React from 'react';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { cx } from '../../../utils/cx';

interface SwatchRowProps {
  colors: string[];
  pageColors?: string[];
  value?: string | undefined;
  onChange: (color: string | undefined) => void;
}

export function normalizeHex(value: string): string | undefined {
  const normalized = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9A-F]{3}$/.test(normalized)) {
    return `#${normalized.slice(1).split('').map((digit) => `${digit}${digit}`).join('')}`;
  }
  return undefined;
}

export function SwatchRow({ colors, pageColors = [], value, onChange }: SwatchRowProps) {
  const uniquePageColors = pageColors.filter((color) => !colors.some((existing) => normalizeHex(existing)?.toLowerCase() === normalizeHex(color)?.toLowerCase()));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? '#000000');
  const [error, setError] = useState(false);

  const handleLiveChange = (raw: string) => { const hex = raw.toUpperCase(); setDraft(hex); setError(false); const valid = normalizeHex(hex); if (valid) onChange(valid); };
  const cancel = () => { if (value) onChange(value); setOpen(false); };
  const openPicker = () => {
    setDraft(value ?? '#000000');
    setError(false);
    setOpen(true);
  };

  const applyCustom = () => {
    const normalized = normalizeHex(draft);
    if (!normalized) {
      setError(true);
      return;
    }
    onChange(normalized);
    setOpen(false);
    setError(false);
  };

  return (
    <div className="relative flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={cx(
          'h-9 rounded-full border px-3 text-[12px] font-medium transition-colors duration-150',
          !value ? 'border-select bg-select-soft text-select' : 'border-line text-mute hover:text-ink'
        )}>
        
        Automático
      </button>
      {colors.map((c) => {
        const active = value?.toLowerCase() === c.toLowerCase();
        const light = ['#ffffff', '#ece6db', '#f5f0e8'].includes(c.toLowerCase());
        return (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            aria-pressed={active}
            onClick={() => onChange(c)}
            className={cx('grid h-9 w-9 place-items-center rounded-full border transition-transform duration-150 active:scale-95', active ? 'border-select ring-2 ring-select/30' : 'border-black/10')}
            style={{ background: c }}>
            
            {active && <CheckIcon className={cx('h-4 w-4', light ? 'text-ink' : 'text-white')} strokeWidth={2.5} />}
          </button>);

      })}
      {uniquePageColors.length > 0 ? (
        <div className="flex min-w-full items-center gap-2.5">
          <span className="text-[11px] font-medium text-mute">Colores de tu página</span>
          {uniquePageColors.map((c) => {
            const active = value?.toLowerCase() === c.toLowerCase();
            const light = ['#ffffff', '#ece6db', '#f5f0e8'].includes(c.toLowerCase());
            return (
              <button
                key={c}
                type="button"
                aria-label={`Color de la página ${c}`}
                aria-pressed={active}
                onClick={() => onChange(c)}
                className={cx('grid h-9 w-9 place-items-center rounded-full border transition-transform duration-150 active:scale-95', active ? 'border-select ring-2 ring-select/30' : 'border-black/10')}
                style={{ background: c }}
              >
                {active && <CheckIcon className={cx('h-4 w-4', light ? 'text-ink' : 'text-white')} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      ) : null}
      <Popover.Root open={open} onOpenChange={(isOpen) => { if (!isOpen && value && normalizeHex(draft) !== normalizeHex(value)) { onChange(value); } setOpen(isOpen); }}><Popover.Trigger asChild><button type="button" onClick={openPicker} className={cx('h-9 rounded-full border px-3 text-[12px] font-medium transition-colors duration-150', value && !colors.some((c) => c.toLowerCase() === value.toLowerCase()) ? 'border-select bg-select-soft text-select' : 'border-line text-mute hover:text-ink')}>Más colores</button></Popover.Trigger>
      <Popover.Portal><Popover.Content side="bottom" align="start" sideOffset={8} className="z-50 w-64 rounded-2xl border border-line bg-white p-3 shadow-xl">
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
        {error && <p className="mt-1 text-[11px] text-red-600">Introduce un color HEX válido, por ejemplo #0B1F3A.</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={cancel} className="rounded-lg px-2.5 py-1.5 text-[12px] text-mute hover:text-ink">Cancelar</button>
          <button type="button" onClick={applyCustom} className="rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium text-white">Aplicar</button>
        </div></Popover.Content></Popover.Portal></Popover.Root>
    </div>);

}
