import React from 'react';
import { PanelSection } from './PanelSection';
import { Segmented } from './Segmented';
import { Toggle } from './Toggle';
import type { TextStyle } from '../../../types/editor';
import { cx } from '../../../utils/cx';

export function TypographyTreatmentPicker({ value, onChange, unifyActive = false }: { value: TextStyle; onChange: (patch: Partial<TextStyle>) => void; unifyActive?: boolean }) {
  return <div className="space-y-4">
    <PanelSection title="Familia">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Tratamiento tipográfico">
        {([
          ['sans', 'Sans', 'font-sans font-semibold'],
          ['editorial', 'Editorial', 'font-serif italic'],
          ['luxury', 'Luxury', 'font-serif uppercase tracking-[0.12em]'],
          ['mixed', 'Mixta', 'font-serif font-semibold'],
          ['script', 'Script', 'font-cursive italic']
        ] as const).map(([type, label, preview]) => {
          const active = (value.typeStyle ?? 'sans') === type;
          return <button key={type} type="button" role="radio" aria-checked={active} onClick={() => onChange({ typeStyle: type })} className={cx('rounded-xl border p-2 text-left transition-colors', active ? 'border-select bg-select-soft text-select' : 'border-line bg-white text-ink hover:border-[#CDD1D7]')}>
            <span className={cx('block text-center text-[20px] leading-7', preview)}>Aa</span>
            <span className="mt-1 block text-center text-[11px] font-medium">{label}</span>
          </button>;
        })}
      </div>
    </PanelSection>
    <PanelSection title="Peso">
      <Segmented ariaLabel="Peso tipográfico" value={value.weight ?? (value.bold ? 'bold' : 'regular')} onChange={(v) => onChange({ weight: v, bold: v === 'bold' })} options={[
        { value: 'regular', label: 'Regular' }, { value: 'medium', label: 'Medio' }, { value: 'bold', label: 'Negrita' }
      ]} />
    </PanelSection>
    <PanelSection title="Tracking">
      <Segmented ariaLabel="Tracking tipográfico" value={value.tracking ?? 'normal'} onChange={(v) => onChange({ tracking: v })} options={[
        { value: 'tight', label: 'Junto' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Amplio' }
      ]} />
    </PanelSection>
    <Toggle label="Mayúsculas" checked={!!value.upper} onChange={(v) => onChange({ upper: v })} />
    <Toggle label="Acento local / dorado" checked={!!value.goldText} onChange={(v) => onChange({ goldText: v })} />
    {value.goldText ?
    <p data-gold-precedence="kept" className="text-[11.5px] leading-snug text-ink opacity-70">
        Este texto conserva el acento dorado local. “Unificar color de texto” no lo cambia.
      </p> :
    unifyActive &&
    <p data-gold-precedence="unified" className="text-[11.5px] leading-snug text-ink opacity-70">
        “Unificar color de texto” está activo: este texto usa el color unificado del contenido.
      </p>}
  </div>;
}
