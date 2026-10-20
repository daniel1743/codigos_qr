import type {
  AgentAction,
  BusinessContext,
  ChatOption,
  ContextPatch,
  TemplateId } from
'../types/cripqer';
import { planNextActions, planSelectionActions } from '../utils/landingPlan';

/*
 * CONV-02 · the landing-action adapter.
 *
 * The Advisor's provider is the only place where model prose meets the landing's
 * action vocabulary, so the conversion lives here and nowhere else. Two rules
 * make it a boundary rather than a convenience:
 *
 *  1. THE EIGHT DETERMINISTIC ACTIONS, AND NOTHING ELSE. A turn may show,
 *     recommend, preview, select, offer chips, show the ready card, patch the
 *     business context or open the drawer. `CREATE_PAGE` is deliberately absent:
 *     CONV-02 keeps it behind the test-only switch in `planCreateCommand`, and
 *     this adapter is the second lock — even a future planner mistake cannot
 *     leak a page-creation command into a conversational turn.
 *  2. PRIMITIVES ONLY. Every action is rebuilt field by field. No array, patch
 *     or option object the planner returned reaches the reducer by reference, so
 *     later mutation of a planner input cannot change an action already queued.
 *
 * It plans nothing itself: `utils/landingPlan.ts` owns every rule, and the
 * catalog is its only source of template ids.
 */

/** The action types a conversational turn may produce. `CREATE_PAGE` is excluded on purpose. */
const TURN_ACTIONS: ReadonlySet<AgentAction['type']> = new Set([
  'SHOW_TEMPLATES',
  'RECOMMEND_TEMPLATES',
  'PREVIEW_TEMPLATE',
  'SELECT_TEMPLATE',
  'SHOW_OPTIONS',
  'SHOW_READY',
  'UPDATE_BUSINESS_CONTEXT',
  'OPEN_TEMPLATE_DRAWER',
]);

function copyPatch(patch: ContextPatch): ContextPatch {
  const copy: ContextPatch = {};
  if (typeof patch.name === 'string') copy.name = patch.name;
  if (typeof patch.type === 'string') copy.type = patch.type;
  if (typeof patch.description === 'string') copy.description = patch.description;
  if (typeof patch.goal === 'string') copy.goal = patch.goal;
  if (patch.channel !== undefined) copy.channel = patch.channel;
  return copy;
}

function copyOptions(options: readonly ChatOption[]): ChatOption[] {
  return options.map((option) => ({ label: option.label, message: option.message }));
}

function copyReasons(
  reasons: Partial<Record<TemplateId, string>> | undefined,
): Partial<Record<TemplateId, string>> | undefined {
  if (reasons === undefined) return undefined;
  const copy: Partial<Record<TemplateId, string>> = {};
  for (const [id, reason] of Object.entries(reasons)) {
    if (typeof reason === 'string') copy[id as TemplateId] = reason;
  }
  return copy;
}

function copyAction(action: AgentAction): AgentAction | null {
  switch (action.type) {
    case 'SHOW_TEMPLATES':
      return { type: 'SHOW_TEMPLATES', scope: 'INITIAL' };
    case 'RECOMMEND_TEMPLATES': {
      const reasons = copyReasons(action.reasons);
      return {
        type: 'RECOMMEND_TEMPLATES',
        ids: [...action.ids],
        ...(action.similarTo === undefined ? {} : { similarTo: action.similarTo }),
        ...(reasons === undefined ? {} : { reasons }),
      };
    }
    case 'PREVIEW_TEMPLATE':
      return { type: 'PREVIEW_TEMPLATE', id: action.id };
    case 'SELECT_TEMPLATE':
      return { type: 'SELECT_TEMPLATE', id: action.id };
    case 'SHOW_OPTIONS':
      return { type: 'SHOW_OPTIONS', options: copyOptions(action.options) };
    case 'SHOW_READY':
      return { type: 'SHOW_READY' };
    case 'UPDATE_BUSINESS_CONTEXT':
      return { type: 'UPDATE_BUSINESS_CONTEXT', patch: copyPatch(action.patch) };
    case 'OPEN_TEMPLATE_DRAWER':
      return { type: 'OPEN_TEMPLATE_DRAWER' };
    case 'CREATE_PAGE':
      // Never a conversational action in CONV-02. See the header.
      return null;
  }
}

/** Rebuilds a planned action list as primitives, dropping anything a turn may not emit. */
export function adaptLandingActions(actions: readonly AgentAction[]): AgentAction[] {
  const adapted: AgentAction[] = [];
  for (const action of actions) {
    if (!TURN_ACTIONS.has(action.type)) continue;
    const copy = copyAction(action);
    if (copy !== null) adapted.push(copy);
  }
  return adapted;
}

/** The deterministic actions for one advisor turn. Prose never names a template. */
export function planTurnActions(input: {
  readonly context: BusinessContext;
  readonly message: string;
}): AgentAction[] {
  return adaptLandingActions(planNextActions(input));
}

/** The deterministic actions for a card click: no provider call, no budget. */
export function planCardActions(context: BusinessContext, id: TemplateId): AgentAction[] {
  return adaptLandingActions(planSelectionActions(context, id));
}
