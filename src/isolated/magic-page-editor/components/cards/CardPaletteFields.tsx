import React from 'react';
import { CheckIcon } from 'lucide-react';
import { visualPalettes, cardPaletteTokens } from '../../data/visualPresets';
import { PanelSection } from '../editor/controls/PanelSection';
import { SwatchRow } from '../editor/controls/SwatchRow';
import { cx } from '../../utils/cx';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { CardContext } from './cardActions';

const tokenFields = [
  ['cardBg', 'Fondo de tarjeta'],
  ['cardSurface', 'Superficie'],
  ['cardText', 'Texto'],
  ['cardMuted', 'Texto secundario'],
  ['cardLine', 'Borde'],
  ['cardAccent', 'CTA / acento'],
  ['cardAccentFg', 'CTA / texto'],
  ['cardIconBg', 'Icono / fondo'],
  ['cardIconColor', 'Icono / color']
] as const;

export function CardPaletteFields({ ctx }: { ctx: CardContext }) {
  const ed = useEditor();
  const theme = useThemeTokens();
  const props = ed.doc.props[ctx.cardId] ?? {};
  const set = (key: string, value: string | undefined) => ed.setProp(ctx.cardId, key, value ?? '');
  const current = props.cardPalette ?? '';
  const clearOverride = () => {
    const keys = [...tokenFields.map(([key]) => key), 'cardPalette', 'surface', 'radius', 'spacing', 'shadow', 'border', 'imageShape', 'ctaVariant', 'ctaShape', 'ctaSize', 'ctaIconPosition', 'ctaKind', 'decorLine', 'decorArc', 'decorWave', 'decorRing', 'decorColor', 'decorOpacity', 'decorWeight', 'decorScale'];
    ed.updateDoc((doc) => ({ ...doc, props: { ...doc.props, [ctx.cardId]: Object.fromEntries(Object.entries(doc.props[ctx.cardId] ?? {}).filter(([key]) => !keys.includes(key))) } }));
  };

  return <div className="space-y-4">
    <div className={cx('rounded-xl border px-3 py-2.5 text-[12px]', current ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-select/30 bg-select-soft text-select')}>
      <p className="font-semibold">{current ? 'Personalizado' : 'Usa estilo del grupo'}</p>
      <p className="mt-0.5 opacity-80">{current ? 'Esta tarjeta tiene overrides propios.' : 'Los cambios del grupo se aplican aquí automáticamente.'}</p>
    </div>
    <PanelSection title="Paleta de tarjeta" hint="Solo cambia esta tarjeta; el fondo de la página permanece intacto.">
      <div role="radiogroup" aria-label="Paleta de tarjeta" className="grid grid-cols-2 gap-2">
        {visualPalettes.map((palette) => {
          const active = current === palette.id;
          return <button
            key={palette.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              const tokens = cardPaletteTokens[palette.id];
              Object.entries(tokens).forEach(([key, value]) => set(key, value));
              set('cardPalette', palette.id);
            }}
            className={cx('rounded-xl border p-2 text-left transition-colors', active ? 'border-select bg-select-soft' : 'border-line hover:border-[#CDD1D7]')}>
            <span className="mb-2 flex h-8 overflow-hidden rounded-lg">
              {palette.swatches.slice(0, 4).map((color) => <span key={color} className="flex-1" style={{ background: color }} />)}
            </span>
            <span className="flex items-center justify-between text-[12px] font-medium text-ink">
              {palette.label}{active && <CheckIcon className="h-3.5 w-3.5 text-select" aria-hidden="true" />}
            </span>
          </button>;
        })}
      </div>
    </PanelSection>

    <button type="button" onClick={clearOverride} disabled={!current && !Object.keys(props).some((key) => tokenFields.some(([field]) => field === key) || ['surface', 'radius', 'spacing', 'shadow', 'border', 'imageShape', 'ctaVariant', 'ctaShape', 'ctaSize', 'ctaIconPosition', 'ctaKind', 'decorLine', 'decorArc', 'decorWave', 'decorRing', 'decorColor', 'decorOpacity', 'decorWeight', 'decorScale'].includes(key))} className="w-full rounded-xl border border-dashed border-select/50 px-3 py-2 text-[12px] font-medium text-select hover:bg-select-soft disabled:cursor-not-allowed disabled:opacity-45">
      Volver al estilo del grupo
    </button>

    <PanelSection title="Colores de tarjeta" hint="Los cambios se guardan en la tarjeta seleccionada.">
      <div className="space-y-3">
        {tokenFields.map(([key, label]) => <div key={key} className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-[12px] font-medium text-mute">{label}</span>
          <SwatchRow
            colors={theme.swatches}
            value={props[key]}
            onChange={(value) => { set(key, value); if (value) set('cardPalette', 'custom'); }} />
        </div>)}
      </div>
    </PanelSection>
  </div>;
}
