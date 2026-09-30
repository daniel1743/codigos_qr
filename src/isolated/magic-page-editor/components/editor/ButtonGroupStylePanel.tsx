import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { PanelSection } from './controls/PanelSection';
import { Segmented } from './controls/Segmented';
import { SwatchRow } from './controls/SwatchRow';
import { CtaStylePicker } from './controls/CtaStylePicker';
import { CtaTreatmentPicker } from './controls/CtaTreatmentPicker';
import { CollapsibleSection } from './controls/CollapsibleSection';
import { ScopeNote } from './controls/ScopeNote';
import { BUTTON_GROUP_PRESET } from '../../utils/buttonGroup';
import type { CtaVariant } from './EditableCTA';

interface ButtonGroupStylePanelProps {
  blockKey: string;
  count: number;
}

const PRESETS: Record<string, { variant: string; shape: string }> = {
  clean: { variant: 'minimal', shape: 'rounded' },
  apple: { variant: 'apple', shape: 'soft' },
  editorial: { variant: 'outline', shape: 'soft' },
  luxury: { variant: 'premium', shape: 'pill' },
  soft: { variant: 'soft', shape: 'pill' },
  glass: { variant: 'glass', shape: 'soft' },
};

const PRESET_OPTIONS = [
  { value: 'clean', label: 'Clean' },
  { value: 'apple', label: 'Apple' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'soft', label: 'Soft' },
  { value: 'glass', label: 'Glass' },
];

/**
 * «Diseño»: the master style of the whole collection.
 * Opened from the group or from any button — same panel, same explicit scope.
 */
export function ButtonGroupStylePanel({ blockKey, count }: ButtonGroupStylePanelProps) {
  const ed = useEditor();
  const t = useThemeTokens();
  const groupId = `block:${blockKey}`;
  const props = ed.doc.props[groupId] ?? {};
  const set = (key: string, value: string) => ed.setProp(groupId, key, value);

  const applyPreset = (preset: string) => {
    const values = PRESETS[preset];
    if (!values) return;
    ed.setProp(groupId, BUTTON_GROUP_PRESET, preset);
    set('groupCardCtaVariant', values.variant);
    set('groupCardCtaShape', values.shape);
  };
  // Editing a value by hand means the preset no longer describes the group.
  const setVariant = (value: string) => {
    set(BUTTON_GROUP_PRESET, '');
    set('groupCardCtaVariant', value);
  };
  const setShape = (value: string) => {
    set(BUTTON_GROUP_PRESET, '');
    set('groupCardCtaShape', value);
  };

  return (
    <div className="space-y-4">
      <ScopeNote scope="group" count={count} />
      <h3 className="text-[13px] font-semibold text-ink">Diseño de los {count} botones</h3>

      <PanelSection title="Preset" hint="Un punto de partida para todo el grupo.">
        <Segmented
          ariaLabel="Preset del grupo"
          options={PRESET_OPTIONS}
          value={props[BUTTON_GROUP_PRESET] ?? ''}
          onChange={applyPreset} />
      </PanelSection>

      <PanelSection title="Color">
        <div className="space-y-3">
          <div>
            <span className="mb-1.5 block text-[12px] text-mute">Fondo</span>
            <SwatchRow colors={t.swatches} value={props['groupCardCtaBackground']} onChange={(v) => set('groupCardCtaBackground', v ?? '')} />
          </div>
          <div>
            <span className="mb-1.5 block text-[12px] text-mute">Texto</span>
            <SwatchRow colors={t.swatches} value={props['groupCardCtaText']} onChange={(v) => set('groupCardCtaText', v ?? '')} />
          </div>
          <div>
            <span className="mb-1.5 block text-[12px] text-mute">Borde</span>
            <SwatchRow colors={t.swatches} value={props['groupCardCtaBorder']} onChange={(v) => set('groupCardCtaBorder', v ?? '')} />
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Estilo">
        <CtaStylePicker value={(props['groupCardCtaVariant'] ?? 'soft') as CtaVariant} onChange={setVariant} />
      </PanelSection>

      <PanelSection title="Forma y tamaño">
        <CtaTreatmentPicker
          hideIconPosition
          hideKind
          shape={(props['groupCardCtaShape'] ?? 'pill') as 'square' | 'soft' | 'pill' | 'circle' | 'rounded'}
          size={(props['groupCardCtaSize'] ?? 'md') as 'sm' | 'md' | 'lg' | 'full'}
          onChange={(key, value) => {
            if (key === 'shape') setShape(value);
            if (key === 'size') set('groupCardCtaSize', value);
          }} />
      </PanelSection>

      <CollapsibleSection title="Tipografía" hint="Peso, espaciado y mayúsculas">
        <Segmented ariaLabel="Peso tipográfico" options={[{ value: 'regular', label: 'Regular' }, { value: 'medium', label: 'Medio' }, { value: 'bold', label: 'Negrita' }]} value={props['groupTypographyWeight'] ?? 'medium'} onChange={(v) => set('groupTypographyWeight', v)} />
        <Segmented ariaLabel="Tracking" options={[{ value: 'tight', label: 'Junto' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Amplio' }]} value={props['groupTypographyTracking'] ?? 'normal'} onChange={(v) => set('groupTypographyTracking', v)} />
        <Segmented ariaLabel="Mayúsculas" options={[{ value: 'off', label: 'Normal' }, { value: 'on', label: 'Mayúsculas' }]} value={props['groupTypographyUppercase'] ?? 'off'} onChange={(v) => set('groupTypographyUppercase', v)} />
      </CollapsibleSection>

      <CollapsibleSection title="Hover" hint="Qué ocurre al pasar el cursor">
        <Segmented ariaLabel="Interacción hover" options={[{ value: 'none', label: 'Ninguno' }, { value: 'lift', label: 'Elevación' }, { value: 'glow', label: 'Brillo' }]} value={props['groupHover'] ?? 'lift'} onChange={(v) => set('groupHover', v)} />
      </CollapsibleSection>
    </div>);
}
