import React from 'react';
import { Toggle } from './Toggle';
import { Segmented } from './Segmented';
import { SwatchRow } from './SwatchRow';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { CircleDashedIcon, MinusIcon, MoveDiagonalIcon, WavesIcon } from 'lucide-react';

interface Props {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function DecorationPicker({ values, onChange }: Props) {
  const theme = useThemeTokens();
  const items = [
    ['decorLine', 'Línea', 'Trazo fino de acento', MinusIcon],
    ['decorArc', 'Arco', 'Media luna en la esquina', MoveDiagonalIcon],
    ['decorWave', 'Onda', 'Curva de separación', WavesIcon],
    ['decorRing', 'Anillo', 'Aro alrededor de la imagen', CircleDashedIcon]
  ] as const;
  return <div className="space-y-3">
    <p className="text-[11px] leading-snug text-mute">Decoración no interactiva · solo visual · no bloquea la selección.</p>
    {items.map(([key, label, description, Icon]) => <div key={key} className="grid min-h-[58px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-line px-2.5 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-ink"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0"><p className="text-[12px] font-medium leading-4 text-ink">{label}</p><p className="mt-0.5 text-[10.5px] leading-4 text-mute">{description}</p></div>
      <Toggle label={`Activar ${label}`} checked={values[key] === 'on'} onChange={(v) => onChange(key, v ? 'on' : 'off')} />
    </div>)}
    <div className="grid gap-3 rounded-xl border border-line p-3">
      <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-3"><span className="text-[12px] font-medium text-mute">Color</span><SwatchRow colors={theme.swatches} value={values.decorColor} onChange={(value) => onChange('decorColor', value ?? '')} /></div>
      <Segmented ariaLabel="Opacidad de decoración" options={[{ value: '25', label: 'Sutil' }, { value: '45', label: 'Media' }, { value: '70', label: 'Fuerte' }]} value={values.decorOpacity ?? '45'} onChange={(value) => onChange('decorOpacity', value)} />
      <Segmented ariaLabel="Grosor de decoración" options={[{ value: '1', label: 'Fino' }, { value: '2', label: 'Medio' }, { value: '3', label: 'Grueso' }]} value={values.decorWeight ?? '1'} onChange={(value) => onChange('decorWeight', value)} />
      <Segmented ariaLabel="Tamaño de decoración" options={[{ value: '75', label: 'Pequeño' }, { value: '100', label: 'Normal' }, { value: '125', label: 'Grande' }]} value={values.decorScale ?? '100'} onChange={(value) => onChange('decorScale', value)} />
    </div>
  </div>;
}
