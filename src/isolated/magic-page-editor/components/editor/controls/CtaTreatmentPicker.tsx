import React from 'react';
import { PanelSection } from './PanelSection';
import { Segmented } from './Segmented';
import type { CtaIconPosition, CtaKind, CtaShape, CtaSize } from '../EditableCTA';

interface Props {
  shape?: CtaShape | undefined;
  size?: CtaSize | undefined;
  iconPosition?: CtaIconPosition | undefined;
  kind?: CtaKind | undefined;
  onChange: (key: 'shape' | 'size' | 'iconPosition' | 'kind', value: string) => void;
}

export function CtaTreatmentPicker({ shape = 'pill', size = 'md', iconPosition = 'none', kind = 'standard', onChange }: Props) {
  return <div className="space-y-4">
    <PanelSection title="Forma">
      <Segmented ariaLabel="Forma del botón" value={shape} onChange={(v) => onChange('shape', v)} options={[
        { value: 'square', label: 'Cuadrado' }, { value: 'soft', label: 'Suave' }, { value: 'pill', label: 'Píldora' }, { value: 'circle', label: 'Círculo' }
      ]} />
    </PanelSection>
    <PanelSection title="Tamaño">
      <Segmented ariaLabel="Tamaño del botón" value={size} onChange={(v) => onChange('size', v)} options={[
        { value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }, { value: 'full', label: 'Completo' }
      ]} />
    </PanelSection>
    <PanelSection title="Icono">
      <Segmented ariaLabel="Posición del icono" value={iconPosition} onChange={(v) => onChange('iconPosition', v)} options={[
        { value: 'none', label: 'Ninguno' }, { value: 'left', label: 'Izquierda' }, { value: 'right', label: 'Derecha' }
      ]} />
    </PanelSection>
    <PanelSection title="Uso">
      <Segmented ariaLabel="Tipo de botón" value={kind} onChange={(v) => onChange('kind', v)} options={[
        { value: 'standard', label: 'Estándar' }, { value: 'card', label: 'Card' }
      ]} />
    </PanelSection>
  </div>;
}
