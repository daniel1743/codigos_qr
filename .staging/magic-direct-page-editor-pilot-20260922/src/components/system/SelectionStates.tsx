import React from 'react';
import { EyeOffIcon } from 'lucide-react';

export function SelectionStates() {
  const sample = 'relative flex h-28 items-center justify-center rounded-2xl bg-[#F5F0E8] text-[22px] text-[#2A2521]';
  const serif = { fontFamily: "'Cormorant Garamond', serif" };
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <figure>
        <div className={sample} style={serif}>
          <span className="rounded px-2 outline-dashed outline-[1.5px] outline-offset-2 outline-select/60">Colaboremos</span>
        </div>
        <figcaption className="mt-2.5 text-[13px] font-semibold text-ink">Hover</figcaption>
        <p className="text-[12.5px] text-mute">Solo escritorio. Invita a tocar.</p>
      </figure>
      <figure>
        <div className={sample} style={serif}>
          <span className="relative rounded px-2 outline outline-2 outline-offset-4 outline-select">
            <span className="absolute -top-8 left-0 rounded-md bg-select px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-white">Botón</span>
            Colaboremos
          </span>
        </div>
        <figcaption className="mt-2.5 text-[13px] font-semibold text-ink">Seleccionado</figcaption>
        <p className="text-[12.5px] text-mute">Anillo de 2 px + etiqueta del objeto.</p>
      </figure>
      <figure>
        <div className={sample} style={serif}>
          <span className="rounded px-2 outline outline-2 outline-offset-4 outline-select">
            Colaboremos<span className="ml-0.5 inline-block h-6 w-[2px] translate-y-1 bg-select" />
          </span>
        </div>
        <figcaption className="mt-2.5 text-[13px] font-semibold text-ink">Editando</figcaption>
        <p className="text-[12.5px] text-mute">Cursor en el propio texto, sin formularios.</p>
      </figure>
      <figure>
        <div className={sample} style={serif}>
          <span className="opacity-40">Colaboremos</span>
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 font-sans text-[10.5px] font-medium text-white">
            <EyeOffIcon className="h-3 w-3" /> Oculto
          </span>
        </div>
        <figcaption className="mt-2.5 text-[13px] font-semibold text-ink">Bloque oculto</figcaption>
        <p className="text-[12.5px] text-mute">Visible al editar, ausente al publicar.</p>
      </figure>
    </div>);

}