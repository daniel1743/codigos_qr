/**
 * CONV-03 · the deterministic creation command.
 *
 * "Créamela" is not a conversation: it is an instruction the landing already
 * knows how to execute. The plan must therefore answer it WITHOUT a provider —
 * either by building the page when the Business Context is ready, or by asking
 * for the next missing slot when it is not. Both branches are checked here, plus
 * the boundary that keeps every other message on the advisor's path.
 */
import { describe, expect, it } from 'vitest';

import {
  emptyContext,
  applyPatch,
  applySelection,
} from '../agent';
import { isCreateIntent, isPageReady } from '../landingPlan';
import { planDeterministicTurn } from '../landingCommands';
import { businessOptions } from '../../data/business';
import { getBusinessType } from '../templates';
import type { BusinessContext } from '../../types/cripqer';

/** A Business Context the landing can build from: type, goal, style and channel. */
function readyContext(): BusinessContext {
  const typed = applyPatch(emptyContext(), {
    type: 'pets',
    goal: 'appointments',
    channel: 'whatsapp',
  });
  return applySelection(typed, 'warm_care');
}

/** A real business type whose goal is genuinely ambiguous, so it is not ready. */
function missingGoalContext(): BusinessContext {
  const typed = applyPatch(emptyContext(), { type: 'real_estate', channel: 'whatsapp' });
  return applySelection(typed, 'professional_trust');
}

describe('CONV-03 · planDeterministicTurn', () => {
  it('ignores a message that is not a creation instruction', () => {
    expect(
      planDeterministicTurn({ context: readyContext(), message: '¿Cuánto cuesta?' }),
    ).toBeNull();
    expect(
      planDeterministicTurn({ context: readyContext(), message: 'Hola, ¿cómo estás?' }),
    ).toBeNull();
  });

  it('builds a ready landing with zero provider involvement', () => {
    const plan = planDeterministicTurn({ context: readyContext(), message: 'Créamela.' });

    expect(plan).not.toBeNull();
    expect(plan!.creates).toBe(true);
    expect(plan!.response.text).toBe('Perfecto. Estoy preparando tu página.');
    expect(plan!.response.actions).toEqual([{ type: 'CREATE_PAGE' }]);
  });

  it('never creates a page when the Business Context is not ready', () => {
    const plan = planDeterministicTurn({ context: emptyContext(), message: 'Créamela.' });

    expect(plan).not.toBeNull();
    expect(plan!.creates).toBe(false);
    expect(plan!.response.actions.some((action) => action.type === 'CREATE_PAGE')).toBe(false);
    expect(plan!.response.text).toContain('¿Para qué tipo de negocio');
    expect(plan!.response.actions).toEqual([{ type: 'SHOW_OPTIONS', options: businessOptions }]);
  });

  it('asks the one missing slot instead of guessing a goal', () => {
    const context = missingGoalContext();
    const type = getBusinessType('real_estate')!;

    expect(isPageReady(context)).toBe(false);

    const plan = planDeterministicTurn({ context, message: 'Créamela.' });

    expect(plan).not.toBeNull();
    expect(plan!.creates).toBe(false);
    expect(plan!.response.text).toBe(type.goalQuestion);
    expect(plan!.response.actions).toEqual([
      { type: 'SHOW_OPTIONS', options: type.goalOptions },
    ]);
  });

  it('recognises the create phrasings the product offers', () => {
    for (const message of [
      'Créamela.',
      'Hazla.',
      'Quiero esta.',
      'Me quedo con esta.',
      'Adelante.',
    ]) {
      expect(isCreateIntent(message)).toBe(true);
      expect(planDeterministicTurn({ context: readyContext(), message })).not.toBeNull();
    }
  });

  it('does not treat a statement of intent as an instruction to build', () => {
    for (const message of ['Quiero una página para mi veterinaria', 'Muéstrame otras']) {
      expect(planDeterministicTurn({ context: readyContext(), message })).toBeNull();
    }
  });

  it('is a pure planning step: equal inputs give equal plans', () => {
    const context = readyContext();
    const first = planDeterministicTurn({ context, message: 'Créamela.' });
    const second = planDeterministicTurn({ context, message: 'Créamela.' });
    expect(second).toEqual(first);
    expect(context).toEqual(readyContext());
  });
});
