import React from 'react';
import { PanelSection } from './PanelSection';
import { Segmented } from './Segmented';
import type { CtaIconPosition, CtaKind, CtaShape, CtaSize } from '../EditableCTA';
import { cx } from '../../../utils/cx';

interface Props {
  shape?: CtaShape | undefined;
  size?: CtaSize | undefined;
  iconPosition?: CtaIconPosition | undefined;
  kind?: CtaKind | undefined;
  onChange: (key: 'shape' | 'size' | 'iconPosition' | 'kind', value: string) => void;
  hideIconPosition?: boolean;
  /** The button group renders no different for `kind`, so the picker is hidden there. */
  hideKind?: boolean;
}

export function CtaTreatmentPicker({ shape = 'pill', size = 'md', iconPosition = 'none', kind = 'standard', onChange, hideIconPosition = false, hideKind = false }: Props) {
  return <div className="space-y-4">
    <PanelSection title="Forma">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma del botón">
        {([
          ['square', 'Cuadrado', 'rounded-none'], ['soft', 'Suave', 'rounded-xl'], ['rounded', 'Redondeado', 'rounded-[20px]'], ['pill', 'Píldora', 'rounded-full']
        ] as const).map(([value, label, radius]) => <button key={value} type="button" role="radio" aria-checked={shape === value} onClick={() => onChange('shape', value)} className={cx('flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border transition-colors', shape === value ? 'border-select bg-select-soft text-select' : 'border-line bg-white text-ink hover:border-[#CDD1D7]')}>
          <span className={cx('h-6 w-16 border border-current bg-current/20', radius)} aria-hidden="true" />
          <span className="text-[11.5px] font-medium">{label}</span>
        </button>)}
      </div>
    </PanelSection>
    <PanelSection title="Tamaño">
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Tamaño del botón">
        {([
          ['sm', 'S', 'w-12'], ['md', 'M', 'w-16'], ['lg', 'L', 'w-20'], ['full', 'Completo', 'w-full']
        ] as const).map(([value, label, width]) => <button key={value} type="button" role="radio" aria-checked={size === value} onClick={() => onChange('size', value)} className={cx('flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-xl border px-1 transition-colors', size === value ? 'border-select bg-select-soft text-select' : 'border-line bg-white text-ink hover:border-[#CDD1D7]')}>
          <span className={cx('h-5 rounded-full border border-current bg-current/20', width)} aria-hidden="true" />
          <span className="text-[11px] font-medium">{label}</span>
        </button>)}
      </div>
    </PanelSection>
    <PanelSection title="Icono">
      <Segmented ariaLabel="Posición del icono" value={iconPosition} onChange={(v) => onChange('iconPosition', v)} options={[
        { value: 'none', label: 'Ninguno' }, { value: 'left', label: 'Izquierda' }, { value: 'right', label: 'Derecha' }
      ]} />
    </PanelSection>
    {!hideKind &&
    <PanelSection title="Uso">
      <Segmented ariaLabel="Tipo de botón" value={kind} onChange={(v) => onChange('kind', v)} options={[
        { value: 'standard', label: 'Estándar' }, { value: 'card', label: 'Card' }
      ]} />
    </PanelSection>}
  </div>;
}
