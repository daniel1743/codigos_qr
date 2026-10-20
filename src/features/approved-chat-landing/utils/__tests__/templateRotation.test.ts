import { describe, expect, it } from 'vitest';
import { createTemplateRotation, rotateSlot, rotationCandidates } from '../templateRotation';
import type { TemplateRotationState } from '../templateRotation';
import { initialTemplateIds, rotationQueue, templates } from '../../data/templates';
import type { TemplateId } from '../../types/cripqer';

/** Mirrors the showcase order the hook uses across the 4 active visible slots. */
const SLOT_ORDER = [1, 3, 0, 2];

function hasDuplicate(ids: TemplateId[]): boolean {
  return ids.some((id, index) => ids.indexOf(id) !== index);
}

function universe(state: TemplateRotationState): TemplateId[] {
  return [...state.slots, ...state.pool];
}

/** Advances one slot the way the showcase does, so the tests share the real order. */
function next(state: TemplateRotationState, step: number): TemplateRotationState {
  return rotateSlot(state, SLOT_ORDER[step % SLOT_ORDER.length]!);
}

function fresh(): TemplateRotationState {
  return createTemplateRotation(initialTemplateIds, rotationCandidates());
}

describe('template rotation uniqueness', () => {
  it('A) starts from the visible slots with a disjoint, queue-ordered pool', () => {
    const state = fresh();
    expect(state.slots).toEqual(initialTemplateIds);
    expect(hasDuplicate(state.slots)).toBe(false);
    expect(state.cooldown).toBeNull();
    expect(state.pool).toEqual(rotationQueue);
    initialTemplateIds.forEach((id) => {
      expect(state.pool.indexOf(id) === -1).toBe(true);
    });
  });

  it('B) rotationCandidates lists every template id exactly once', () => {
    const candidates = rotationCandidates();
    expect(hasDuplicate(candidates)).toBe(false);
    expect(candidates.length).toBe(templates.length);
    templates.forEach((template) => {
      expect(candidates.indexOf(template.id) !== -1).toBe(true);
    });
  });

  it('C) 300 consecutive rotations never repeat a visible templateId', () => {
    let state = fresh();
    for (let step = 0; step < 300; step++) {
      state = next(state, step);
      expect(hasDuplicate(state.slots)).toBe(false);
      expect(state.slots.length).toBe(initialTemplateIds.length);
    }
  });

  it('D) a template that leaves waits at least one rotation before it can return', () => {
    let state = fresh();
    const outgoing = initialTemplateIds[1]!;
    state = rotateSlot(state, 1);
    expect(state.slots[1] === outgoing).toBe(false);
    expect(state.slots.indexOf(outgoing) === -1).toBe(true);
    expect(state.cooldown).toBe(outgoing);
    expect(state.pool.indexOf(outgoing) !== -1).toBe(true);
    state = next(state, 0);
    expect(state.slots.indexOf(outgoing) === -1).toBe(true);
    let returned = state.slots.indexOf(outgoing) !== -1;
    for (let step = 1; step <= rotationCandidates().length; step++) {
      if (returned) break;
      state = next(state, step);
      returned = state.slots.indexOf(outgoing) !== -1;
    }
    expect(returned).toBe(true);
  });

  it('E) slots plus pool always hold every candidate exactly once', () => {
    let state = fresh();
    const total = rotationCandidates().length;
    for (let step = 0; step < 120; step++) {
      state = next(state, step);
      const ids = universe(state);
      expect(ids.length).toBe(total);
      expect(hasDuplicate(ids)).toBe(false);
    }
  });

  it('F) rotateSlot is deterministic and leaves its input untouched', () => {
    const state = fresh();
    const slots = state.slots.slice();
    const pool = state.pool.slice();
    expect(rotateSlot(state, 1)).toEqual(rotateSlot(state, 1));
    expect(state.slots).toEqual(slots);
    expect(state.pool).toEqual(pool);
    expect(state.cooldown).toBeNull();
  });

  it('G) an out-of-range slot is a no-op', () => {
    const state = fresh();
    expect(rotateSlot(state, -1)).toBe(state);
    expect(rotateSlot(state, initialTemplateIds.length)).toBe(state);
  });

  it('H) fewer templates than slots never duplicates or invents one', () => {
    const slots: TemplateId[] = ['warm_care', 'dark_craft', 'food_story'];
    let state = createTemplateRotation(slots, slots.slice());
    expect(state.pool).toEqual([]);
    for (let step = 0; step < 10; step++) {
      const index = step - Math.floor(step / slots.length) * slots.length;
      state = rotateSlot(state, index);
      expect(state.slots).toEqual(slots);
      expect(hasDuplicate(state.slots)).toBe(false);
    }
  });

  it('I) the pool keeps its order and only the id that just left is on cooldown', () => {
    const state = fresh();
    const afterFirst = rotateSlot(state, 0);
    expect(afterFirst.slots[0]).toBe(state.pool[0]);
    expect(afterFirst.cooldown).toBe(state.slots[0]);
    const afterSecond = rotateSlot(afterFirst, 2);
    expect(afterSecond.slots[2]).toBe(afterFirst.pool[0]);
  });

  it('J) matches the legacy FIFO rotation step by step, so only duplicates change', () => {
    let legacyQueue = [...rotationQueue];
    let legacySlots = initialTemplateIds.slice();
    let state = fresh();
    for (let step = 0; step < rotationQueue.length * 3; step++) {
      const slot = SLOT_ORDER[step % SLOT_ORDER.length]!;
      const incoming = legacyQueue.shift()!;
      legacyQueue.push(legacySlots[slot]!);
      legacySlots = legacySlots.map((id, index) => (index === slot ? incoming : id));
      state = rotateSlot(state, slot);
      expect(state.slots).toEqual(legacySlots);
    }
  });
});
