import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { visualPalettes, cardPaletteTokens } from '../../data/visualPresets';
import { PanelSection } from '../editor/controls/PanelSection';
import { Segmented } from '../editor/controls/Segmented';
import { SwatchRow } from '../editor/controls/SwatchRow';
import { MediaShapePicker, type MediaShape } from '../editor/controls/MediaShapePicker';
import { CtaTreatmentPicker } from '../editor/controls/CtaTreatmentPicker';
import { DecorationPicker } from '../editor/controls/DecorationPicker';
import { cardOrder } from '../../utils/cardOps';
import type { CardFamilyDef } from '../../types/editor';

export function CardGroupStyleFields({ blockKey, family }: { blockKey: string; family: CardFamilyDef }) {
  const ed = useEditor();
  const t = useThemeTokens();
  const blockId = `block:${blockKey}`;
  const props = ed.doc.props[blockId] ?? {};
  const siblingCount = cardOrder(ed.doc, blockKey, family.items.length).length;
  const set = (key: string, value: string) => ed.setProp(blockId, key, value);
  const applyPalette = (id: string) => {
    const tokens = cardPaletteTokens[id];
    ed.updateDoc((doc) => ({ ...doc, props: { ...doc.props, [blockId]: { ...doc.props[blockId], groupCardPalette: id, ...Object.fromEntries(Object.entries(tokens).map(([key, value]) => [`group${key[0].toUpperCase()}${key.slice(1)}`, value])) } } }));
  };
  return <div className="space-y-5">
    <div className="rounded-xl border border-select/30 bg-select-soft px-3 py-2.5 text-[12px] text-select">
      <p className="font-semibold">Grupo: {family.label}</p>
      <p className="mt-0.5">{siblingCount} tarjetas · los overrides individuales se conservan.</p>
    </div>
    <PanelSection title={`${family.label} · Paleta`} hint="Se aplica a todas las tarjetas sin override individual.">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Paleta del grupo de tarjetas">
        {visualPalettes.map((palette) => <button key={palette.id} type="button" role="radio" aria-checked={props.groupCardPalette === palette.id} onClick={() => applyPalette(palette.id)} className={`rounded-xl border p-2 text-left ${props.groupCardPalette === palette.id ? 'border-select bg-select-soft' : 'border-line bg-white'}`}>
          <span className="mb-2 flex gap-1">{[palette.page.color, palette.page.surface, palette.accent].map((color) => <i key={color} className="h-4 w-4 rounded-full border border-black/10" style={{ background: color }} />)}</span>
          <span className="block text-[11px] font-medium text-ink">{palette.label}</span>
        </button>)}
      </div>
    </PanelSection>
    <PanelSection title="Estilo del grupo">
      <Segmented ariaLabel="Superficie del grupo" options={[{ value: 'surface', label: 'Tarjeta' }, { value: 'outline', label: 'Contorno' }, { value: 'plain', label: 'Sin fondo' }, { value: 'accent', label: 'Acento' }]} value={props.groupCardSurfaceStyle ?? 'surface'} onChange={(value) => set('groupCardSurfaceStyle', value)} />
    </PanelSection>
    <PanelSection title="Forma y ritmo">
      <Segmented ariaLabel="Esquinas del grupo" options={[{ value: 'none', label: 'Rectas' }, { value: 'S', label: 'Suaves' }, { value: 'M', label: 'Plantilla' }, { value: 'L', label: 'Amplias' }]} value={props.groupCardRadius ?? 'M'} onChange={(value) => set('groupCardRadius', value)} />
      <div className="mt-3"><Segmented ariaLabel="Espaciado del grupo" options={[{ value: 'S', label: 'Compacto' }, { value: 'M', label: 'Medio' }, { value: 'L', label: 'Amplio' }]} value={props.groupCardSpacing ?? 'M'} onChange={(value) => set('groupCardSpacing', value)} /></div>
    </PanelSection>
    <PanelSection title="Forma de imagen del grupo" hint="Los overrides de una tarjeta se conservan.">
      <MediaShapePicker value={(props.groupImageShape ?? 'rounded') as MediaShape} onChange={(value) => set('groupImageShape', value)} />
    </PanelSection>
    <PanelSection title="Acento personalizado" hint="Usa el selector existente; solo afecta a este grupo.">
      <SwatchRow colors={t.swatches} value={props.groupCardAccent} onChange={(value) => set('groupCardAccent', value ?? '')} />
    </PanelSection>
    <PanelSection title="Botones del grupo" hint="Los botones con override individual conservan su estilo.">
      <Segmented ariaLabel="Estilo CTA del grupo" options={[{ value: 'solid', label: 'Sólido' }, { value: 'outline', label: 'Contorno' }, { value: 'ghost', label: 'Fantasma' }, { value: 'glass', label: 'Cristal' }]} value={props.groupCardCtaVariant ?? 'solid'} onChange={(value) => set('groupCardCtaVariant', value)} />
      <CtaTreatmentPicker
        shape={props.groupCardCtaShape as 'square' | 'soft' | 'pill' | 'circle' | undefined}
        size={props.groupCardCtaSize as 'sm' | 'md' | 'lg' | 'full' | undefined}
        iconPosition={props.groupCardCtaIconPosition as 'none' | 'left' | 'right' | undefined}
        kind={props.groupCardCtaKind as 'standard' | 'card' | undefined}
        onChange={(key, value) => set(`groupCardCta${key[0].toUpperCase()}${key.slice(1)}`, value)} />
    </PanelSection>
    
  </div>;
}
