import { businessOptions } from '../data/business';
import { templates } from '../data/templates';
import {
  applyPatch,
  applySelection,
  extractContext,
  nextStep,
  normalize,
  resolveOrdinal,
  resolveTemplateReference,
  similarTo,
} from './agent';
import { getBusinessType } from './templates';
import { deriveBusinessReadiness } from '../state/businessContext';
import type {
  AgentAction,
  BusinessContext,
  ChatOption,
  TemplateId } from
'../types/cripqer';

/*
 * CONV-02 · the landing's deterministic planner.
 *
 * THE MODEL DOES NOT ACT. The Conversion Advisor returns prose, intents and a
 * suggested conversational move; everything that CHANGES the landing — filling
 * the context, picking a style, showing chips, opening the drawer — is decided
 * here, by catalog lookups and word rules, and returned as the existing closed
 * `AgentAction[]` union.
 *
 * That is why no id from the model is ever used: `planNextActions` only ever
 * names a template it found in `data/templates`, and only ever patches a field
 * the deterministic extractor understood. A hallucinated "dark_craft_2" cannot
 * travel: it is not a key this planner writes.
 *
 * It is also why a deterministic turn costs NOTHING: selecting a card, showing
 * the business-type chips or opening the drawer needs no provider call, so the
 * provider can answer those without reserving budget.
 *
 * Kept compatible with the prototype on purpose — it reuses `extractContext`,
 * `applyPatch`, `applySelection`, `nextStep`, `rankFamilies` and the reference
 * and ordinal resolvers, so the landing behaves the way it already did. Only
 * the text is new, and it comes from the advisor.
 */

/* ------------------------------ intents -------------------------------- */

/** Explicit "build it now" wording. Deliberately narrow: it is an instruction, not a wish. */
const CREATE_INTENT =
  /(creamela|creala|crealo|hazmela|hazla|generala|crea mi pagina ya|crear ya|adelante|dale,? crea|ya,? crea|listo,? crea|vamos con|creala ya|generala ya)/;

/** "Show me it" wording: preview without committing. */
const PREVIEW_CUE = /(muestrame|muestra|verla|verlo|ver|abre|abreme|preview|ensename|como se ve|como queda|ejemplo)/;

/** The drawer: every family in one place. */
const DRAWER_CUE =
  /(todas las plantillas|catalogo|ver plantillas|todos los estilos|ver estilos|mas plantillas|ver todas|otras opciones)/;

/** "The ones I saw when I arrived". */
const INITIAL_CUE = /(principio|al entrar|al inicio|antes)/;
const INITIAL_OBJECT = /(plantilla|estilo|muestra|ver|vi|mostra)/;

/** "Something in that line". */
const SIMILAR_CUE = /(parecida|similar|otra (opcion|igual|asi)|algo asi|en esa linea|mas como)/;

export function isCreateIntent(raw: string): boolean {
  return CREATE_INTENT.test(normalize(raw));
}

/**
 * A style the visitor NAMED, resolved against the catalog and the cards already
 * shown. Returns `null` when nothing matches — never a guess.
 */
export function resolveNamedSelection(raw: string, ctx: BusinessContext): TemplateId | null {
  return resolveTemplateReference(normalize(raw), ctx);
}

/**
 * A style the visitor picked by POSITION ("la segunda", "la última") among the
 * cards currently shown. Returns `null` without a shown list or a choice verb.
 */
export function resolveOrdinalSelection(raw: string, ctx: BusinessContext): TemplateId | null {
  return resolveOrdinal(normalize(raw), ctx);
}

/** The template family a message names on its own, with no reference cue. */
function namedFamily(raw: string): TemplateId | null {
  const t = normalize(raw);
  const hit = templates.find((template) => t.includes(normalize(template.name)));
  return hit?.id ?? null;
}

/* ------------------------------ readiness ------------------------------- */

/** One authority for "the landing can build the page now". */
export function isPageReady(ctx: BusinessContext): boolean {
  return deriveBusinessReadiness(ctx).readyForPage;
}

/**
 * The next question the landing asks, in the order it has always asked it:
 * rubro → objetivo → estilo → canal → listo. Reused from `nextStep` so the two
 * planners cannot drift; `explicitCreate: false` means it can never produce
 * `CREATE_PAGE` here.
 */
export function nextSlotActions(ctx: BusinessContext): AgentAction[] {
  return nextStep(ctx, false).actions;
}

/* -------------------------------- plan ---------------------------------- */

export interface LandingPlanInput {
  /** The context BEFORE this turn's own patch is applied. */
  readonly context: BusinessContext;
  /** What the visitor typed. */
  readonly message: string;
}

/**
 * The actions one conversational turn produces.
 *
 * Precedence, highest first:
 *   1. a context patch the extractor understood (always first, so later actions
 *      act on the patched context),
 *   2. a style chosen by name or position (preview-only when the visitor asked
 *      to SEE it),
 *   3. "the ones I saw when I arrived",
 *   4. "something similar",
 *   5. "show me everything",
 *   6. the next missing slot — or the ready card when nothing is missing.
 *
 * It never emits `CREATE_PAGE`: CONV-02 does not wire creation. The action is
 * proven by `planCreateCommand` below, and production wiring belongs to CONV-03.
 */
export function planNextActions(input: LandingPlanInput): AgentAction[] {
  const actions: AgentAction[] = [];
  const patch = extractContext(input.message);
  if (Object.keys(patch).length > 0) actions.push({ type: 'UPDATE_BUSINESS_CONTEXT', patch });

  const ctx = applyPatch(input.context, patch);
  const t = normalize(input.message);

  const ordinal = resolveOrdinal(t, ctx);
  const named = ordinal ?? resolveTemplateReference(t, ctx);
  const preview = PREVIEW_CUE.test(t);

  if (named) {
    // "Muéstrame la segunda" asks to LOOK; "quiero la segunda" asks to KEEP it.
    if (preview && ordinal === null) {
      return [...actions, { type: 'PREVIEW_TEMPLATE', id: named }];
    }
    return [...actions, { type: 'SELECT_TEMPLATE', id: named }, ...nextSlotActions(applySelection(ctx, named))];
  }

  const direct = namedFamily(input.message);
  if (direct && preview) {
    return [...actions, { type: 'PREVIEW_TEMPLATE', id: direct }];
  }
  if (direct) {
    return [...actions, { type: 'SELECT_TEMPLATE', id: direct }, ...nextSlotActions(applySelection(ctx, direct))];
  }

  if (INITIAL_CUE.test(t) && INITIAL_OBJECT.test(t)) {
    return [...actions, { type: 'SHOW_TEMPLATES', scope: 'INITIAL' }];
  }

  if (SIMILAR_CUE.test(t)) {
    const similar = similarTo(ctx);
    if (similar) {
      return [
        ...actions,
        { type: 'RECOMMEND_TEMPLATES', ids: similar.ids, similarTo: similar.base }];

    }
  }

  if (DRAWER_CUE.test(t)) {
    return [...actions, { type: 'OPEN_TEMPLATE_DRAWER' }];
  }

  // Before the next slot: if the visitor asked for the page and it is ready,
  // the landing shows the ready card. `nextSlotActions` already returns
  // SHOW_READY in that case, so both branches are the same action — the branch
  // exists to make the CONV-02 boundary explicit and testable.
  if (isCreateIntent(input.message) && isPageReady(ctx)) {
    return [...actions, { type: 'SHOW_READY' }];
  }

  return [...actions, ...nextSlotActions(ctx)];
}

/**
 * CONTRACT TEST ONLY — the create command, behind an explicit switch.
 *
 * CONV-02 must prove that `CREATE_PAGE` is a well-formed action the landing can
 * consume, WITHOUT handing production a way to create a page before CONV-03
 * wires the real flow. So the switch defaults to `false` and the only caller is
 * a test. When the flow is wired, CONV-03 passes the readiness decision that
 * already exists in the session rather than flipping a default here.
 */
export function planCreateCommand(
  ctx: BusinessContext,
  options: { readonly allow?: boolean } = {},
): AgentAction[] {
  if (options.allow !== true) return [];
  return isPageReady(ctx) ? [{ type: 'CREATE_PAGE' }] : [];
}

/* ----------------------------- selection -------------------------------- */

/** The deterministic plan for a card click: no conversation, no provider call. */
export function planSelectionActions(ctx: BusinessContext, id: TemplateId): AgentAction[] {
  return [{ type: 'SELECT_TEMPLATE', id }, ...nextSlotActions(applySelection(ctx, id))];
}

/** The business-type and channel chips the landing can offer, catalog-bound. */
export function businessChips(): ChatOption[] {
  return businessOptions;
}

export function goalChips(typeId: string | null): ChatOption[] {
  return getBusinessType(typeId)?.goalOptions ?? [];
}
