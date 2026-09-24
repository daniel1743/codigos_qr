import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitorIcon, SmartphoneIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { templateOrder, templates } from '../../data/templates';
import type { Device, TemplateId } from '../../types/editor';

export function DirectionsGrid() {
  const ed = useEditor();
  const navigate = useNavigate();
  const open = (id: TemplateId, device: Device) => {
    ed.setTemplateId(id);
    ed.setDevice(device);
    navigate('/');
  };

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {templateOrder.map((id) => {
        const meta = templates[id];
        const tones = meta.theme.tones;
        return (
          <article key={id} className="flex flex-col overflow-hidden rounded-3xl border border-line bg-white">
            <div className="relative aspect-[4/3] overflow-hidden" style={{ background: tones[0].color }}>
              <img src={meta.preview} alt="" className="h-full w-full object-cover" />
              <span
                className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-[12px] font-medium"
                style={{ background: tones[0].color, color: tones[0].fg, fontFamily: meta.theme.fonts[0].display }}>
                
                {meta.short}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-[17px] font-semibold text-ink">{meta.name}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">{meta.description}</p>
              <div className="mt-4 flex items-center gap-1.5">
                {tones.map((t) =>
                <span key={t.id} title={t.label} className="h-6 w-6 rounded-full border border-black/10" style={{ background: t.color }} />
                )}
                <span className="ml-2 truncate text-[12px] text-mute">{meta.fontsLabel}</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-[13px] text-ink">
                {meta.demonstrates.map((d) =>
                <li key={d} className="flex gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink" />
                    {d}
                  </li>
                )}
              </ul>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                <button
                  type="button"
                  onClick={() => open(id, 'desktop')}
                  className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-ink text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90">
                  
                  <MonitorIcon className="h-4 w-4" /> Escritorio
                </button>
                <button
                  type="button"
                  onClick={() => open(id, 'mobile')}
                  className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-line text-[13px] font-semibold text-ink transition-colors duration-150 hover:bg-[#F7F8FA]">
                  
                  <SmartphoneIcon className="h-4 w-4" /> Móvil
                </button>
              </div>
            </div>
          </article>);

      })}
    </div>);

}