import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { PanelSection } from '../editor/controls/PanelSection';
import { Segmented } from '../editor/controls/Segmented';
import { SwatchRow } from '../editor/controls/SwatchRow';
import type { CardContext } from './cardActions';

/**
 * Only `cardId` is used, so the panel also works for a surface that has no card
 * family (e.g. the Bio "collection" overlay): the caller passes the enclosing
 * item id without having to fabricate a full `CardContext`.
 */
export function CardSurfaceFields({ ctx }: { ctx: Pick<CardContext, 'cardId'> }) {
  const ed = useEditor();
  const theme = useThemeTokens();
  const id = ctx.cardId;
  const props = ed.doc.props[id] ?? {};
  const set = (key: string, value: string | undefined) => ed.setProp(id, key, value ?? '');
  return <div className="space-y-4">
    <PanelSection title="Superficie interior" hint="Panel de contenido de esta tarjeta; altura natural al contenido.">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3"><span className="text-[12px] font-medium text-mute">Fondo</span><SwatchRow colors={theme.swatches} value={props.cardBg} onChange={(value) => set('cardBg', value)} /></div>
        <div className="flex items-center justify-between gap-3"><span className="text-[12px] font-medium text-mute">Borde</span><SwatchRow colors={theme.swatches} value={props.cardLine} onChange={(value) => set('cardLine', value)} /></div>
      </div>
    </PanelSection>
    <PanelSection title="Dimensin y borde">
      <div className="mt-3"><Segmented ariaLabel="Radio de superficie" options={[{ value: 'none', label: 'Recto' }, { value: 'S', label: 'Suave' }, { value: 'M', label: 'Plantilla' }, { value: 'L', label: 'Amplias' }]} value={props.radius ?? 'M'} onChange={(value) => set('radius', value)} /></div>
      <div className="mt-3"><Segmented ariaLabel="Relleno de superficie" options={[{ value: 'S', label: 'Compacto' }, { value: 'M', label: 'Medio' }, { value: 'L', label: 'Amplio' }]} value={props.spacing ?? 'M'} onChange={(value) => set('spacing', value)} /></div>
    </PanelSection>
    <PanelSection title="Sombra">
      <Segmented ariaLabel="Sombra de superficie" options={[{ value: 'none', label: 'Sin sombra' }, { value: 'soft', label: 'Suave' }, { value: 'lifted', label: 'Elevada' }]} value={props.shadow ?? 'none'} onChange={(value) => set('shadow', value)} />
    </PanelSection>
  </div>;
}
