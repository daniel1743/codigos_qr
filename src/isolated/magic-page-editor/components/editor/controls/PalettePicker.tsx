import React, { useState } from 'react';
import { CheckIcon, ChevronLeftIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';
import { extractPageColorSwatches } from '../../../data/pageColorSwatches';
import { colorFamilies, familyPalettesByFamily, visualPaletteById, visualPalettes } from '../../../data/visualPresets';
import { useEditor } from '../../../contexts/EditorContext';
import { useThemeTokens } from '../../../hooks/useThemeTokens';

import { PanelSection } from './PanelSection';
import { PageColorTokens } from './PageColorTokens';
import { Segmented } from './Segmented';
import { SwatchRow } from './SwatchRow';

type PaletteMode = 'families' | 'themes';

/* Index keys: two stops of the same palette can repeat (e.g. Editorial White),
   and a repeated colour as a React key would log a duplicate-key warning. */
function SwatchStrip({ colors, className }: { colors: string[]; className: string }) {
  return <span className={className}>{colors.map((color, index) => <span key={`${color}-${index}`} className="flex-1" style={{ background: color }} />)}</span>;
}

function PaletteButton({ palette, active, onSelect }: { palette: { id: string; label: string; swatches: string[] }; active: boolean; onSelect: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onSelect} className={cx('rounded-xl border p-2 text-left', active ? 'border-select bg-select-soft' : 'border-line')}>
    <SwatchStrip colors={palette.swatches.slice(0, 4)} className="mb-2 flex h-8 overflow-hidden rounded-lg" />
    <span className="flex items-center justify-between text-[12px] font-medium text-ink">{palette.label}{active && <CheckIcon className="h-3.5 w-3.5 text-select" />}</span>
  </button>;
}

export function PalettePicker({ value, onChange, textColor, onTextColorChange, swatches = ['#111111', '#FFFFFF', '#6F5A48', '#1F4E57', '#3A3D44'] }: { value?: string | undefined; onChange: (value: string) => void; textColor?: string; onTextColorChange?: (v: string | undefined) => void; swatches?: string[] }) {
  const ed = useEditor();
  const tokens = useThemeTokens();
  const page = ed.doc.props['page'] ?? {};
  const pageColors = extractPageColorSwatches(tokens, page, swatches);

  const active = value ? visualPaletteById[value] : undefined;
  /* Two systems in one panel: the family matrix opens on the family that holds
     the current palette, and a page already using a named theme opens on Temas. */
  const [mode, setMode] = useState<PaletteMode>(active?.familyId ? 'families' : value ? 'themes' : 'families');
  const [familyId, setFamilyId] = useState<string | undefined>(active?.familyId);
  const family = familyId ? colorFamilies.find((item) => item.id === familyId) : undefined;
  const variants = family ? familyPalettesByFamily[family.id] ?? [] : [];

  return <div className="space-y-4">
    <Segmented<PaletteMode>
      ariaLabel="Sistema de color"
      options={[{ value: 'families', label: 'Familias de colores' }, { value: 'themes', label: 'Temas' }]}
      value={mode}
      onChange={setMode}
    />

    {mode === 'themes' ? <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-ink">Temas</p>
          <p className="text-[11px] text-mute">Paletas temáticas de la galería.</p>
        </div>
        <span className="rounded-full bg-select-soft px-2 py-1 text-[10px] font-semibold text-select">{visualPalettes.length} temas</span>
      </div>
      <div data-theme-grid className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {visualPalettes.map((palette) => <PaletteButton key={palette.id} palette={palette} active={value === palette.id} onSelect={() => onChange(palette.id)} />)}
      </div>
    </> : family ? <>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setFamilyId(undefined)} className="inline-flex items-center gap-1 text-[12px] font-medium text-select">
          <ChevronLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Familias
        </button>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">{family.label}</span>
      </div>
      <div data-palette-grid className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {variants.map((palette) => <PaletteButton key={palette.id} palette={palette} active={value === palette.id} onSelect={() => onChange(palette.id)} />)}
      </div>
      {active && <p className="text-[11px] text-mute">Seleccionada: <span className="font-medium text-ink">{active.label}</span></p>}
    </> : <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-ink">Familias de colores</p>
          <p className="text-[11px] text-mute">Elige una dirección visual.</p>
        </div>
        <span className="rounded-full bg-select-soft px-2 py-1 text-[10px] font-semibold text-select">{colorFamilies.length} familias</span>
      </div>
      <div data-palette-families className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {colorFamilies.map((item) => {
          /* La matriz garantiza seis variantes por familia (ver colorFamilyMatrix.test),
             así que el preview siempre existe; el acceso opcional solo evita un crash
             si algún día el dato faltara. */
          const preview = visualPaletteById[`${item.id}-medium`];
          const activeFamily = active?.familyId === item.id;
          return <button key={item.id} type="button" aria-label={`${item.label}: ${item.variants.length} variantes`} onClick={() => setFamilyId(item.id)} className={cx('rounded-xl border p-2 text-left transition-colors hover:border-select hover:bg-select-soft', activeFamily ? 'border-select bg-select-soft' : 'border-line')}>
            <SwatchStrip colors={(preview?.swatches ?? []).slice(0, 4)} className="mb-2 flex h-8 overflow-hidden rounded-lg" />
            <span className="block text-[12px] font-medium text-ink">{item.label}</span>
            <span className="text-[10px] text-mute">{item.variants.length} variantes</span>
          </button>;
        })}
      </div>
    </>}

    <PageColorTokens swatches={swatches} />
    {onTextColorChange && (
      <PanelSection title="Color de texto único" hint="Fuerza un mismo color para todo el texto de la página.">        <label className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!textColor}
            onChange={(e) => onTextColorChange(e.target.checked ? swatches[0] || '#000000' : undefined)}
            className="rounded border-line text-select focus:ring-select"
          />
          <span className="text-[13px] font-medium text-ink">Unificar color de texto</span>
        </label>
        {textColor && (
          <div className="flex items-center justify-between gap-3">
            <SwatchRow colors={swatches} pageColors={pageColors} value={textColor} onChange={onTextColorChange} />
            <div className="relative flex-shrink-0 h-8 w-8 overflow-hidden rounded-full border border-line shadow-sm">
              <input type="color" value={textColor} onChange={(e) => onTextColorChange(e.target.value)} className="absolute -top-2 -left-2 h-12 w-12 cursor-pointer" />
            </div>
          </div>
        )}
      </PanelSection>
    )}
  </div>;
}
