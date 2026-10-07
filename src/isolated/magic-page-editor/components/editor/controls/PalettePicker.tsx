import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';
import { extractPageColorSwatches } from '../../../data/pageColorSwatches';
import { visualPalettes } from '../../../data/visualPresets';
import { useEditor } from '../../../contexts/EditorContext';
import { useThemeTokens } from '../../../hooks/useThemeTokens';

import { PanelSection } from './PanelSection';
import { PageColorTokens } from './PageColorTokens';
import { SwatchRow } from './SwatchRow';

export function PalettePicker({ value, onChange, textColor, onTextColorChange, swatches = ['#111111', '#FFFFFF', '#6F5A48', '#1F4E57', '#3A3D44'] }: { value?: string | undefined; onChange: (value: string) => void; textColor?: string; onTextColorChange?: (v: string | undefined) => void; swatches?: string[] }) {
  const ed = useEditor();
  const tokens = useThemeTokens();
  const page = ed.doc.props['page'] ?? {};
  const pageColors = extractPageColorSwatches(tokens, page, swatches);
  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-mute">{visualPalettes.length} paletas disponibles</p>
      <span className="text-[11px] text-mute">Desliza para ver todas</span>
    </div>
    <div data-palette-grid className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1">
    {visualPalettes.map((palette) => <button key={palette.id} type="button" aria-pressed={value === palette.id} onClick={() => onChange(palette.id)} className={cx('rounded-xl border p-2 text-left', value === palette.id ? 'border-select bg-select-soft' : 'border-line')}>
      <span className="mb-2 flex h-8 overflow-hidden rounded-lg">
        {palette.swatches.slice(0, 4).map((color) => <span key={color} className="flex-1" style={{ background: color }} />)}
      </span>
      <span className="flex items-center justify-between text-[12px] font-medium text-ink">{palette.label}{value === palette.id && <CheckIcon className="h-3.5 w-3.5 text-select" />}</span>
    </button>)}
  </div>
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
