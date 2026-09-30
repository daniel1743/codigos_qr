import React from 'react';
import { useEditor } from '../../contexts/EditorContext';

/** Decorative-only layer. It is deliberately non-interactive and never registers a target. */
export function DecorationLayer({ id = 'page', values }: { id?: string; values?: Record<string, string> }) {
  const { doc } = useEditor();
  const props = values ?? doc.props[id] ?? {};
  const color = props.decorColor || 'var(--accent)';
  const opacity = Number(props.decorOpacity ?? 45) / 100;
  const weight = Number(props.decorWeight ?? 1);
  const scale = Number(props.decorScale ?? 100) / 100;
  const enabled = (key: string) => props[key] === 'on';
  if (!enabled('decorLine') && !enabled('decorArc') && !enabled('decorWave') && !enabled('decorRing')) return null;
  return <div aria-hidden="true" data-decoration-layer className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
    {enabled('decorLine') && <span className="absolute left-[8%] top-[18%] h-px w-[34%] rotate-[-8deg]" style={{ background: color, opacity, height: weight }} />}
    {enabled('decorArc') && <span className="absolute right-[-7%] top-[8%] rounded-full" style={{ width: `${12 * scale}rem`, height: `${12 * scale}rem`, border: `${weight}px solid ${color}`, opacity }} />}
    {enabled('decorWave') && <span className="absolute bottom-[12%] left-[12%] w-[76%] rounded-[50%]" style={{ height: `${4 * scale}rem`, borderBottom: `${weight}px solid ${color}`, opacity }} />}
    {enabled('decorRing') && <span className="absolute bottom-[22%] right-[10%] rounded-full" style={{ width: `${5 * scale}rem`, height: `${5 * scale}rem`, border: `${weight}px solid ${color}`, opacity }} />}
  </div>;
}
