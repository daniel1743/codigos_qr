import { describe, expect, it } from 'vitest';

import { emptyContext } from '../../utils/agent';
import { createBusinessContextStore } from '../../state/businessContext';
import { adaptLandingActions, planCardActions, planTurnActions } from '../landingActionAdapter';
import type { AgentAction, BusinessContext, TemplateId } from '../../types/cripqer';

const ALLOWED = new Set([
  'SHOW_TEMPLATES',
  'RECOMMEND_TEMPLATES',
  'PREVIEW_TEMPLATE',
  'SELECT_TEMPLATE',
  'SHOW_OPTIONS',
  'SHOW_READY',
  'UPDATE_BUSINESS_CONTEXT',
  'OPEN_TEMPLATE_DRAWER',
]);

function readyContext(): BusinessContext {
  const store = createBusinessContextStore();
  store.patch({ name: 'Santos', type: 'barbershop', description: 'Barbería clásica' });
  store.patch({ goal: 'bookings', channel: 'whatsapp' });
  store.selectTemplate('dark_craft');
  return store.get();
}

describe('CONV-02 · the landing-action adapter is a closed boundary', () => {
  it('drops CREATE_PAGE even if a caller hands it one', () => {
    const mixed: AgentAction[] = [{ type: 'SHOW_READY' }, { type: 'CREATE_PAGE' }];
    expect(adaptLandingActions(mixed)).toEqual([{ type: 'SHOW_READY' }]);
  });

  it('rebuilds actions from primitives, so later mutation of the input cannot move them', () => {
    const ids: TemplateId[] = ['dark_craft'];
    const reasons: Partial<Record<TemplateId, string>> = { dark_craft: 'misma línea' };
    const source: AgentAction[] = [
      { type: 'RECOMMEND_TEMPLATES', ids, similarTo: 'dark_craft', reasons },
    ];

    const adapted = adaptLandingActions(source);

    ids.push('warm_care');
    reasons.dark_craft = 'mutado';

    expect(adapted).toEqual([
      {
        type: 'RECOMMEND_TEMPLATES',
        ids: ['dark_craft'],
        similarTo: 'dark_craft',
        reasons: { dark_craft: 'misma línea' },
      },
    ]);
  });

  it('plans a turn within the eight deterministic actions', () => {
    const cases = [
      'Muéstrame las plantillas que vi al principio',
      'Muéstrame otra parecida',
      'Ver todas las plantillas',
      'Tengo una barbería y quiero reservas por WhatsApp',
      'Ya, créamela',
    ];

    for (const message of cases) {
      const actions = planTurnActions({ context: readyContext(), message });
      for (const action of actions) {
        expect(ALLOWED.has(action.type)).toBe(true);
      }
    }
  });

  it('a card click selects exactly that catalog id and never creates a page', () => {
    const actions = planCardActions(emptyContext(), 'dark_craft');
    expect(actions[0]).toEqual({ type: 'SELECT_TEMPLATE', id: 'dark_craft' });
    expect(actions.some((action) => action.type === 'CREATE_PAGE')).toBe(false);
  });

  it('a create instruction on a ready landing asks to show readiness, not to create', () => {
    const actions = planTurnActions({ context: readyContext(), message: 'Ya, créala' });
    expect(actions.some((action) => action.type === 'CREATE_PAGE')).toBe(false);
    expect(actions).toContainEqual({ type: 'SHOW_READY' });
  });
});
