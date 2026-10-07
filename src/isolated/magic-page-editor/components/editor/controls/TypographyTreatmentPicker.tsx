import React from 'react';
import { PanelSection } from './PanelSection';
import { Segmented } from './Segmented';
import { Toggle } from './Toggle';
import { NumberField } from './NumberField';
import type { TextStyle, TextWeight } from '../../../types/editor';
import { cx } from '../../../utils/cx';

/**
 * Weight steps. `medium`/`bold`/`regular` keep the meaning they always had;
 * `light` (300), `semibold` (600) and `extrabold` (800) are new and were needed
 * by six of the twelve Magic Patterns families, whose headings sit at 300, 600
 * or 800 — none of which the old three-step scale could express.
 */
const WEIGHTS: { value: TextWeight; label: string; preview: string }[] = [
  { value: 'light', label: 'Fina', preview: 'font-light' },
  { value: 'regular', label: 'Regular', preview: 'font-normal' },
  { value: 'medium', label: 'Media', preview: 'font-medium' },
  { value: 'semibold', label: 'Semi', preview: 'font-semibold' },
  { value: 'bold', label: 'Negrita', preview: 'font-bold' },
  { value: 'extrabold', label: 'Extra', preview: 'font-extrabold' },
];

export function TypographyTreatmentPicker({ value, onChange, unifyActive = false }: { value: TextStyle; onChange: (patch: Partial<TextStyle>) => void; unifyActive?: boolean }) {
  const customTracking = typeof value.tracking === 'number' ? value.tracking : undefined;

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
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Peso tipográfico">
        {WEIGHTS.map((w) => {
          const active = (value.weight ?? (value.bold ? 'bold' : 'regular')) === w.value;
          return <button key={w.value} type="button" role="radio" aria-checked={active} onClick={() => onChange({ weight: w.value, bold: w.value === 'bold' })} className={cx('rounded-xl border px-2 py-1.5 text-center transition-colors', active ? 'border-select bg-select-soft text-select' : 'border-line bg-white text-ink hover:border-[#CDD1D7]')}>
            <span className={cx('block text-[17px] leading-6', w.preview)}>Aa</span>
            <span className="mt-0.5 block text-[10.5px] font-medium">{w.label}</span>
          </button>;
        })}
      </div>
    </PanelSection>
    <PanelSection title="Tracking" hint="Los tres pasos de siempre, o un valor en em.">
      <Segmented ariaLabel="Tracking tipográfico" value={customTracking === undefined ? (value.tracking ?? 'normal') as string : 'custom'} onChange={(v) => onChange({ tracking: v as TextStyle['tracking'] })} options={[
        { value: 'tight', label: 'Junto' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Amplio' }
      ]} />
      <div className="mt-2">
        <NumberField
          label="Personalizado"
          value={customTracking}
          onChange={(n) => onChange({ tracking: n })}
          step={0.01}
          min={-0.1}
          max={1}
          suffix="em"
          placeholder="0.18"
        />
      </div>
    </PanelSection>
    <PanelSection title="Interlineado" hint="Vacío conserva el interlineado de la plantilla.">
      <NumberField
        label="Multiplicador"
        value={value.lineHeight}
        onChange={(n) => onChange({ lineHeight: n })}
        step={0.05}
        min={0.8}
        max={3}
        suffix="×"
        placeholder="1.4"
      />
    </PanelSection>
    <Toggle label="Cursiva" checked={!!value.italic} onChange={(v) => onChange({ italic: v })} />
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
