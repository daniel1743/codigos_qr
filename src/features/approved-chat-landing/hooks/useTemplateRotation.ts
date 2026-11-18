import { useEffect, useRef, useState } from 'react';
import { initialTemplateIds, rotationQueue } from '../data/templates';
import type { TemplateId } from '../types/cripqer';

const INTERVAL_MS = 5200;
const SLOT_ORDER = [1, 3, 0, 4, 2];

/** Ambient rotation: one slot at a time swaps in the next family from the queue. */
export function useTemplateRotation(active: boolean) {
  const [slots, setSlots] = useState<TemplateId[]>(initialTemplateIds);
  const [paused, setPaused] = useState(false);
  const queue = useRef<TemplateId[]>([...rotationQueue]);
  const cursor = useRef(0);

  useEffect(() => {
    if (!active || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const slot = SLOT_ORDER[cursor.current % SLOT_ORDER.length]!;
      cursor.current += 1;
      setSlots((prev) => {
        const incoming = queue.current.shift();
        if (!incoming) return prev;
        queue.current.push(prev[slot]!);
        return prev.map((tid, i) => i === slot ? incoming : tid);
      });
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, paused]);

  return { slots, setPaused };
}