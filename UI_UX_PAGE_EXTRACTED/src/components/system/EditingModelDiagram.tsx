import React from 'react';
import { AlignCenterIcon, BoldIcon, ChevronDownIcon, EllipsisIcon, PaletteIcon, PenLineIcon, TypeIcon, XIcon } from 'lucide-react';
import { images } from '../../data/images';

/** Static illustration of the same text contract rendered on both surfaces. */
export function EditingModelDiagram() {
  const tiles = [
  { icon: PenLineIcon, label: 'Escribir' },
  { icon: TypeIcon, label: 'Tamaño' },
  { icon: BoldIcon, label: 'Negrita' },
  { icon: PaletteIcon, label: 'Color' },
  { icon: AlignCenterIcon, label: 'Alinear' },
  { icon: EllipsisIcon, label: 'Más' }];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <figure className="rounded-3xl border border-line bg-white p-6">
        <figcaption className="mb-5 flex items-center justify-between text-[13px]">
          <span className="font-semibold text-ink">Escritorio · barra flotante</span>
          <span className="text-mute">Clic → edición inmediata</span>
        </figcaption>
        <div className="relative overflow-hidden rounded-2xl bg-[#F5F0E8] px-8 pb-10 pt-24">
          <div className="absolute left-1/2 top-6 flex h-11 -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-[14px] border border-line bg-white px-1.5 text-ink shadow-toolbar">
            <span className="px-2 text-[12px] font-medium text-mute">Nombre</span>
            <span className="mx-1 h-5 w-px bg-line" />
            <span className="flex items-center rounded-xl bg-[#F2F3F5] p-0.5 text-[12.5px]">
              <span className="grid h-7 w-7 place-items-center">−</span>
              <span className="w-8 text-center tabular-nums">54</span>
              <span className="grid h-7 w-7 place-items-center">+</span>
            </span>
            <span className="grid h-8 w-8 place-items-center"><BoldIcon className="h-4 w-4" /></span>
            <span className="flex h-8 items-center gap-1 px-1.5"><PaletteIcon className="h-4 w-4" /><span className="h-3 w-3 rounded-full bg-[#2A2521]" /></span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-select-soft text-select"><AlignCenterIcon className="h-4 w-4" /></span>
            <span className="mx-1 h-5 w-px bg-line" />
            <span className="flex h-8 items-center gap-1 px-2 text-[12.5px] font-medium">Más <ChevronDownIcon className="h-3.5 w-3.5" /></span>
            <span className="grid h-8 w-8 place-items-center"><XIcon className="h-4 w-4" /></span>
          </div>
          <div className="flex flex-col items-center text-center">
            <img src={images.bioAvatar} alt="" className="h-16 w-16 rounded-full border-4 border-[#F5F0E8] object-cover" />
            <p className="relative mt-4 rounded-md px-2 text-[40px] leading-none text-[#2A2521] outline outline-2 outline-offset-4 outline-select" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Marina Solé<span className="ml-0.5 inline-block h-9 w-[2px] translate-y-1 bg-select" />
            </p>
            <p className="mt-4 text-[12px] uppercase tracking-[0.16em] text-[#7A6F65]">Creadora · Viajes lentos</p>
          </div>
        </div>
      </figure>

      <figure className="rounded-3xl border border-line bg-white p-6">
        <figcaption className="mb-5 flex items-center justify-between text-[13px]">
          <span className="font-semibold text-ink">Móvil · bottom sheet</span>
          <span className="text-mute">Mismas acciones</span>
        </figcaption>
        <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[32px] border-[7px] border-[#17181B] bg-[#F5F0E8]">
          <div className="flex flex-col items-center px-5 pb-6 pt-8 text-center">
            <img src={images.bioAvatar} alt="" className="h-14 w-14 rounded-full object-cover" />
            <span className="relative mt-4">
              <span className="absolute -top-6 left-0 rounded-md bg-select px-1.5 py-0.5 text-[10px] font-semibold text-white">Nombre</span>
              <span className="block rounded-md px-1.5 text-[30px] leading-none text-[#2A2521] outline outline-2 outline-offset-4 outline-select" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Marina Solé
              </span>
            </span>
          </div>
          <div className="rounded-t-[20px] bg-white px-3 pb-4 pt-2 shadow-[0_-10px_30px_-12px_rgba(16,24,40,0.3)]">
            <div className="mx-auto mb-2.5 h-1 w-8 rounded-full bg-[#D5D8DD]" />
            <p className="mb-2.5 px-1 text-[13px] font-semibold text-ink">Nombre</p>
            <div className="grid grid-cols-3 gap-1.5">
              {tiles.map((t) =>
              <span key={t.label} className="flex h-14 flex-col items-center justify-center gap-1 rounded-xl bg-[#F4F5F7] text-[10.5px] font-medium text-ink">
                  <t.icon className="h-4 w-4" strokeWidth={1.8} />
                  {t.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </figure>
    </div>);

}