import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../../contexts/EditorContext';
import { StaticRenderContext } from '../../contexts/StaticRenderContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { FamilyCard } from '../cards/FamilyCard';
import { cardFamilies, cardFamilyOrder } from '../../data/cardFamilies';
import { toneVars } from '../../utils/styles';
import { cx } from '../../utils/cx';
import type { CardFamily } from '../../types/editor';

/** Static gallery of every family × variant, rendered with the real card shell and current template tokens. */
export function CardFamiliesShowcase() {
  const ed = useEditor();
  const t = useThemeTokens();
  const navigate = useNavigate();
  const [active, setActive] = useState<CardFamily>('catalog');
  const family = cardFamilies[active];

  const openInEditor = () => {
    ed.setTemplateId('business');
    ed.setDevice('desktop');
    navigate('/');
    window.setTimeout(() => ed.select('card.0', { reveal: true }), 120);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-line" role="tablist" aria-label="Familia de tarjetas">
          {cardFamilyOrder.map((id) =>
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => setActive(id)}
            className={cx(
              'inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors duration-150',
              active === id ? 'bg-ink text-white' : 'text-mute hover:text-ink'
            )}>
            
              {cardFamilies[id].label}
              <span className={cx('h-1.5 w-1.5 rounded-full', cardFamilies[id].visible ? 'bg-[#16A34A]' : 'bg-[#C4C8CE]')} aria-hidden />
            </button>
          )}
        </div>
        <button type="button" onClick={openInEditor} className="ml-auto h-9 rounded-xl bg-ink px-4 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90">
          Editar Catálogo en el editor
        </button>
      </div>
      <p className="mt-3 text-[13.5px] text-mute">
        <span className="font-medium text-ink">{family.label}</span> · {family.subtitle}.{' '}
        {family.visible ? 'Visible en el selector de bloques.' : 'Preparada; oculta en producción (no aparece como «Próximamente»).'}
      </p>

      <StaticRenderContext.Provider value>
        <div
          className="mt-6 grid gap-5 rounded-3xl p-5 md:grid-cols-2 md:p-8"
          style={{ ...toneVars(t.page), background: t.page.color, color: t.page.fg, fontFamily: t.bodyFont }}
          onClickCapture={(e) => e.preventDefault()}>
          
          {family.variants.map((v) => {
            const wide = v.layout !== 'top' && v.layout !== 'bottom' && v.layout !== 'compact';
            return (
              <figure key={v.id} className={cx('flex flex-col', wide && 'md:col-span-2')}>
                <figcaption className="mb-2.5 text-[12px] font-medium" style={{ color: t.page.muted }}>
                  {v.label}
                </figcaption>
                <div className={cx(!wide && v.dense ? 'grid grid-cols-2 gap-3' : '')}>
                  <FamilyCard id={`showcase:${family.id}.${v.id}.card.0`} family={family} item={family.items[0]} blockProps={{ variant: v.id }} />
                  {!wide && v.dense &&
                  <FamilyCard id={`showcase:${family.id}.${v.id}.card.1`} family={family} item={family.items[1]} blockProps={{ variant: v.id }} />
                  }
                </div>
              </figure>);

          })}
        </div>
      </StaticRenderContext.Provider>
    </div>);

}