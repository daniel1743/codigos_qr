import React from 'react';
import { PanelSection } from './PanelSection';
import { Segmented } from './Segmented';
import { Toggle } from './Toggle';
import type { TextStyle } from '../../../types/editor';

export function TypographyTreatmentPicker({ value, onChange }: { value: TextStyle; onChange: (patch: Partial<TextStyle>) => void }) {
  return <div className="space-y-4">
    <PanelSection title="Familia">
      <Segmented ariaLabel="Tratamiento tipográfico" value={value.typeStyle ?? 'sans'} onChange={(v) => onChange({ typeStyle: v })} options={[
        { value: 'sans', label: 'Sans' }, { value: 'editorial', label: 'Editorial' }, { value: 'luxury', label: 'Luxury' }, { value: 'mixed', label: 'Mixta' }, { value: 'script', label: 'Script' }
      ]} />
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
  </div>;
}
