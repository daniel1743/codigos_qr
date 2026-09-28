import React from 'react';
import { Toggle } from './Toggle';

interface Props {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function DecorationPicker({ values, onChange }: Props) {
  return <div className="space-y-2">
    <Toggle label="Línea" checked={values['decorLine'] === 'on'} onChange={(v) => onChange('decorLine', v ? 'on' : 'off')} />
    <Toggle label="Arco" checked={values['decorArc'] === 'on'} onChange={(v) => onChange('decorArc', v ? 'on' : 'off')} />
    <Toggle label="Onda" checked={values['decorWave'] === 'on'} onChange={(v) => onChange('decorWave', v ? 'on' : 'off')} />
    <Toggle label="Anillo" checked={values['decorRing'] === 'on'} onChange={(v) => onChange('decorRing', v ? 'on' : 'off')} />
  </div>;
}
