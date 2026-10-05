import React from 'react';
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { PanelSection } from '../editor/controls/PanelSection';
import { Segmented } from '../editor/controls/Segmented';
import { Toggle } from '../editor/controls/Toggle';
import { DecorationPicker } from '../editor/controls/DecorationPicker';
import { cardOrder, moveCard } from '../../utils/cardOps';
import { layoutsForFamily, resolveCard } from '../../utils/cardLayout';
import { cx } from '../../utils/cx';
import type { CardContext } from './cardActions';
import { CardPaletteFields } from './CardPaletteFields';
import { CardPresetPicker } from './CardPresetPicker';

/** «Más» for a full card: order, visibility, spacing, radius, border, shadow and optional fields. */
export function CardAdvanced({ ctx }: {ctx: CardContext;}) {
  const ed = useEditor();
  const { cardId, blockKey, family, itemId } = ctx;
  const cp = ed.doc.props[cardId] ?? {};
  const set = (k: string, v: string) => ed.setProp(cardId, k, v);
  const order = cardOrder(ed.doc, blockKey, family.items.length);
  const index = order.indexOf(itemId);
  const hidden = cp.hidden === 'on';
  const sample = family.items[0];
  const layout = resolveCard(family, ed.doc.props[`block:${blockKey}`] ?? {}, cp).layout;
  const btn =
  'inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-[#F7F8FA] disabled:opacity-35';
  const flag = (k: string) => (cp[k] ?? 'on') === 'on';

  return (
    <div className="space-y-5">
      <PanelSection title="Orden y visibilidad">
        <div className="flex gap-2">
          <button type="button" className={btn} disabled={index <= 0 || ed.canonicalEditing} onClick={() => ed.updateDoc((d) => moveCard(d, blockKey, family.items.length, itemId, -1))}>
            <ArrowUpIcon className="h-4 w-4" /> Subir
          </button>
          <button type="button" className={btn} disabled={index >= order.length - 1 || ed.canonicalEditing} onClick={() => ed.updateDoc((d) => moveCard(d, blockKey, family.items.length, itemId, 1))}>
            <ArrowDownIcon className="h-4 w-4" /> Bajar
          </button>
          <button type="button" className={cx(btn, hidden && 'border-select bg-select-soft text-select')} onClick={() => set('hidden', hidden ? 'off' : 'on')}>
            {hidden ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />} {hidden ? 'Mostrar' : 'Ocultar'}
          </button>
        </div>
      </PanelSection>

      {ed.canonicalEditing && (
        <PanelSection title="Composición de tarjeta">
          <Segmented
            ariaLabel="Diseño"
            options={layoutsForFamily(family)}
            value={layout}
            onChange={(v) => set("layout", v)}
          />
          <div className="mt-4">
            <Toggle
              label="Énfasis visual"
              checked={flag("emphasis")}
              onChange={(v) => set("emphasis", v ? "on" : "off")}
            />
          </div>
        </PanelSection>
      )}

      <CardPresetPicker ctx={ctx} />
      <CardPaletteFields ctx={ctx} />

      

      <PanelSection title="Campos">
        {sample.price !== undefined && <Toggle label="Precio" checked={flag('showPrice')} onChange={(v) => set('showPrice', v ? 'on' : 'off')} />}
        {sample.previousPrice !== undefined && <Toggle label="Precio anterior" checked={flag('showPrev')} onChange={(v) => set('showPrev', v ? 'on' : 'off')} />}
        {family.items.some((i) => i.badge) && <Toggle label="Etiqueta" checked={flag('showBadge')} onChange={(v) => set('showBadge', v ? 'on' : 'off')} />}
        {family.items.some((i) => i.cta) && <Toggle label="Botón" checked={flag('showCta')} onChange={(v) => set('showCta', v ? 'on' : 'off')} />}
        {/*
          Título y Descripción: la superficie de la tarjeta solo existe mientras haya
          contenido visible, así que estos dos textos se muestran/ocultan con el mismo
          mecanismo de elementos (`doc.removed` + `ed.toggleHidden`). Ocultar NO borra el
          texto: al volver a mostrarlo recupera exactamente el valor anterior y CardBody
          reaparece automáticamente.
        */}
        <Toggle
          label="Título"
          checked={ed.doc.removed[`${cardId}.title`] !== true}
          onChange={() => ed.toggleHidden(`${cardId}.title`)}
        />
        <Toggle
          label="Descripción"
          checked={ed.doc.removed[`${cardId}.desc`] !== true}
          onChange={() => ed.toggleHidden(`${cardId}.desc`)}
        />
      </PanelSection>

      <PanelSection title="Espaciado interior">
        <Segmented
          ariaLabel="Espaciado interior"
          options={[
          { value: 'S', label: 'Compacto' },
          { value: 'M', label: 'Medio' },
          { value: 'L', label: 'Amplio' }]
          }
          value={cp.spacing ?? 'M'}
          onChange={(v) => set('spacing', v)} />

      </PanelSection>
      <PanelSection title="Esquinas">
        <Segmented
          ariaLabel="Esquinas"
          options={[
          { value: 'none', label: 'Rectas' },
          { value: 'S', label: 'Suaves' },
          { value: 'M', label: 'Plantilla' },
          { value: 'L', label: 'Amplias' }]
          }
          value={cp.radius ?? 'M'}
          onChange={(v) => set('radius', v)} />

      </PanelSection>
      <PanelSection title="Sombra">
        <Segmented
          ariaLabel="Sombra"
          options={[
          { value: 'none', label: 'Sin sombra' },
          { value: 'soft', label: 'Suave' },
          { value: 'lifted', label: 'Elevada' }]
          }
          value={cp.shadow ?? 'none'}
          onChange={(v) => set('shadow', v)} />

      </PanelSection>
      <Toggle label="Borde" checked={(cp.border ?? (cp.surface === 'plain' ? 'off' : 'on')) === 'on'} onChange={(v) => set('border', v ? 'on' : 'off')} />
    </div>);

}
