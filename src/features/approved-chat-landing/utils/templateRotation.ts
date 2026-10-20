import { rotationQueue, templates } from '../data/templates';
import type { TemplateId } from '../types/cripqer';

/**
 * Ambient template rotation, kept as pure bookkeeping.
 *
 * The showcase must never show the same templateId in two slots at once: a
 * repeated card reads as "Cripqer has few templates". Uniqueness is enforced
 * here, by construction, instead of trusting the queue order to never collide.
 *
 * The pool holds every id that is not on screen. Taking one out of the pool and
 * pushing the outgoing id back in keeps the pool exactly aligned with what is
 * hidden, which is what makes an incoming id unique against the slots it joins.
 */
export interface TemplateRotationState {
  /** What each slot shows, in slot order. */
  slots: TemplateId[];
  /** Ids that are not on screen, in the order the next ones should come in. */
  pool: TemplateId[];
  /** The id that just left: it may return, but never on the very next rotation. */
  cooldown: TemplateId | null;
}

/**
 * The incoming order: the curated rotation queue first, then any family the
 * queue does not mention yet, so a new template cannot be left out silently.
 */
export function rotationCandidates(): TemplateId[] {
  return Array.from(new Set([...rotationQueue, ...templates.map((template) => template.id)]));
}

/** Starts from the visible slots; everything else waits in the pool. */
export function createTemplateRotation(
  initialSlots: TemplateId[],
  candidates: TemplateId[]
): TemplateRotationState {
  const visible = new Set(initialSlots);
  return {
    slots: initialSlots.slice(),
    pool: candidates.filter((id) => !visible.has(id)),
    cooldown: null
  };
}

/**
 * Swaps one slot for an id that is on screen nowhere else.
 *
 * The pool already excludes every visible id, so uniqueness only needs the
 * cooldown skipped; if that leaves nothing, uniqueness wins over the cooldown.
 *
 * Deterministic: same state and slot, same result. When nothing can be shown
 * without repeating a visible id (fewer templates than slots) the state comes
 * back untouched, so the rotation skips instead of duplicating or inventing a
 * template.
 */
export function rotateSlot(state: TemplateRotationState, slot: number): TemplateRotationState {
  if (slot < 0) return state;
  if (slot >= state.slots.length) return state;

  const eligible = state.pool.filter((id) => id !== state.cooldown);
  const incoming = eligible[0] ?? state.pool[0];
  if (incoming === undefined) return state;

  const outgoing = state.slots[slot];
  return {
    slots: state.slots.map((id, index) => (index === slot ? incoming : id)),
    pool: [
      ...state.pool.filter((id) => id !== incoming),
      ...(outgoing === undefined ? [] : [outgoing])
    ],
    cooldown: outgoing ?? null
  };
}
