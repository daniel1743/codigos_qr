import React from 'react';
import { useEditor } from '../../contexts/EditorContext';

/** Decorative-only layer. It is deliberately non-interactive and never registers a target. */
export function DecorationLayer({ id = 'page' }: { id?: string }) {
  const { doc } = useEditor();
  const props = doc.props[id] ?? {};
  const enabled = (key: string) => props[key] === 'on';
  if (!enabled('decorLine') && !enabled('decorArc') && !enabled('decorWave') && !enabled('decorRing')) return null;
  return <div aria-hidden="true" data-decoration-layer className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
    {enabled('decorLine') && <span className="absolute left-[8%] top-[18%] h-px w-[34%] rotate-[-8deg] bg-[var(--accent)] opacity-60" />}
    {enabled('decorArc') && <span className="absolute right-[-7%] top-[8%] h-48 w-48 rounded-full border-2 border-[var(--accent)] opacity-35" />}
    {enabled('decorWave') && <span className="absolute bottom-[12%] left-[12%] h-16 w-[76%] rounded-[50%] border-b-2 border-[var(--accent)] opacity-35" />}
    {enabled('decorRing') && <span className="absolute bottom-[22%] right-[10%] h-20 w-20 rounded-full border border-[var(--accent)] opacity-45" />}
  </div>;
}
