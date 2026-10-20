import { useEffect, useRef, useState } from 'react';
import { initialTemplateIds } from '../data/templates';
import { createTemplateRotation, rotationCandidates, rotateSlot } from '../utils/templateRotation';
import type { TemplateId } from '../types/cripqer';

export const INTERVAL_MS = 3200;
const SLOT_ORDER = [1, 3, 0, 2];

/** Ambient rotation: one slot at a time swaps in the next family from the pool. */
export function useTemplateRotation(active: boolean) {
  const state = useRef(createTemplateRotation(initialTemplateIds, rotationCandidates()));
  const [slots, setSlots] = useState<TemplateId[]>(state.current.slots);
  const [paused, setPaused] = useState(false);
  const cursor = useRef(0);

  useEffect(() => {
    if (!active || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const slot = SLOT_ORDER[cursor.current % SLOT_ORDER.length]!;
      cursor.current += 1;
      // Rotate outside the state updater: React may invoke an updater twice
      // (StrictMode), and mutating the pool there used to duplicate a template
      // across two visible slots.
      state.current = rotateSlot(state.current, slot);
      setSlots(state.current.slots);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, paused]);

  return { slots, setPaused };
}
