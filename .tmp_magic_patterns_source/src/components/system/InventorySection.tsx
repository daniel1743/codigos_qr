import React from 'react';
import { blockKit } from '../../data/blockKit';
import { collectionVariants, editorParts } from '../../data/systemContent';
import { HeroVariantThumb, heroVariants } from '../editor/controls/HeroVariantPicker';
import { CollectionVariantThumb } from './CollectionVariantThumb';

export function InventorySection() {
  return (
    <div className="space-y-12">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">Block Kit V1 · bloques públicos</h3>
        <p className="mt-1 text-[13.5px] text-mute">El pie de página es estructura fija. El espaciado es una propiedad de cada bloque, no un bloque.</p>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          {blockKit.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.type} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-ink ring-1 ring-line">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink">{b.label}</span>
                  <span className="block text-[12px] leading-snug text-mute">{b.description}</span>
                </span>
              </div>);

          })}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Portada · 4 variantes</h3>
          <p className="mt-1 text-[13.5px] text-mute">Una estructura; cada plantilla parte de una distinta. Se cambian desde la barra de la portada.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {heroVariants.map((v) =>
            <div key={v.value}>
                <div className="h-24 overflow-hidden rounded-xl border border-line">
                  <HeroVariantThumb variant={v.value} />
                </div>
                <p className="mt-2 text-[13px] font-semibold text-ink">{v.label}</p>
                <p className="text-[12px] text-mute">{v.hint}</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Colección · 6 variantes</h3>
          <p className="mt-1 text-[13.5px] text-mute">Mismo contrato de card para todas: editar texto, imagen, enlace, quitar.</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {collectionVariants.map((v) =>
            <div key={v.id}>
                <div className="h-24 overflow-hidden rounded-xl border border-line bg-white">
                  <CollectionVariantThumb variant={v.id} />
                </div>
                <p className="mt-2 text-[13px] font-semibold text-ink">{v.label}</p>
                <p className="text-[12px] leading-snug text-mute">{v.use}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[15px] font-semibold text-ink">Piezas del editor</h3>
        <dl className="mt-5 grid gap-x-10 sm:grid-cols-2">
          {editorParts.map((p) =>
          <div key={p.name} className="flex gap-4 border-t border-line py-3.5">
              <dt className="w-[180px] shrink-0 text-[13.5px] font-medium text-ink">{p.name}</dt>
              <dd className="text-[13px] leading-relaxed text-mute">{p.spec}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>);

}