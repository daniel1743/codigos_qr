/**
 * CRIPQER Conversion Advisor — CA-12 · deterministic understanding fast path.
 *
 * WHY THIS EXISTS. CA-11B measured a real turn: 27.8 s, of which 13.9 s was the
 * CA-3 classifier and 4.9 s the CA-4 advisor. The classifier is a full provider
 * round-trip that exists to INTERPRET the visitor; for a message whose meaning
 * is structurally unambiguous it re-derives a fact this module can establish
 * locally. Skipping it there removes the dominant term of the first turn without
 * changing what the turn decides.
 *
 * WHAT IT IS NOT. It is not a second classifier and it does not answer anything.
 * It returns the SAME `VisitorSignals` vocabulary CA-3 produces — one intent,
 * no invented business facts, no readiness guess — and CA-4 still writes the
 * reply, CA-4 still selects the capabilities, CA-5 still decides the action and
 * CA-8 still reserves the advisor call. Only a provider call that provably added
 * no information is avoided.
 *
 * WHEN IT MUST REFUSE. Anything whose meaning depends on the conversation
 * (deictics such as "eso"), anything carrying a business fact (`tengo`, `soy`,
 * `mi negocio`…), anything with a URL, and anything matching more than one rule
 * is INELIGIBLE and returns `null`, so the canonical classifier runs. A greeting
 * is deliberately ineligible: AM-01 ("Hola") is the corpus's canonical ambiguous
 * case, and no rule here may swallow it.
 *
 * The caller decides WHERE it applies. CA-12 applies it to the FIRST turn only:
 * there is no prior context to lose yet. Later turns keep the canonical path.
 *
 * PURE: type-only imports, no provider, no environment, no clock. The equality
 * gate (`integration/__tests__/fast-path-equivalence.test.ts`) runs it over the
 * whole evaluation corpus and fails if a rule disagrees with a golden intent.
 */

import type { IntentId, VisitorSignals } from "./contract";

export type DeterministicRule =
  | "INSTRUCTION_OVERRIDE"
  | "EXPLICIT_PRICE_QUESTION"
  | "EXPLICIT_CREATION_REQUEST";

export interface DeterministicResolution {
  readonly rule: DeterministicRule;
  readonly signals: VisitorSignals;
}

/**
 * A message whose meaning depends on the previous turn. Refusing these is what
 * keeps the fast path out of memory semantics: "¿Eso tiene costo?" is only a
 * pricing question because MT-02 said "fotógrafa" one turn earlier.
 */
const CONTEXT_DEPENDENT =
  /\b(eso|esto|esa|este|esos|estas|estos|aquello|aquella|ahi|ahí|alli|allí|lo\s+mismo|tambien|también)\b/i;

/**
 * A message that states a business fact. Those facts are exactly what CA-3
 * extracts into `business_type` / `expressed_needs`, and they must reach CA-6's
 * memory; a deterministic signal set carries none of them, so such a message is
 * never eligible.
 */
const BUSINESS_FACT =
  /\b(tengo|soy|vendo|ofrezco|trabajo|doy\s+clases|atiendo|manejo|mi\s+negocio|mi\s+empresa|mi\s+tienda|mi\s+marca|mi\s+pagina|mi\s+página|mi\s+catalogo|mi\s+catálogo)\b/i;

/** A URL in the visitor's text is a case for the canonical classifier, never a rule. */
const URL_LIKE = /\b(https?:\/\/|www\.)\S+/i;

/** Instructions aimed at the model, not at the product. Refusing them is always safe. */
const INSTRUCTION_OVERRIDE = [
  /\bignora(r)?\b[^.!?]{0,80}\b(instrucciones?|reglas?|cat[aá]logo|seguridad)\b/i,
  /\b(api[ -]?key|clave\s+(de\s+)?api)\b/i,
  /\bact[uú]a\b[^.!?]{0,40}\bcomo\s+(desarrollador|administrador|admin|sistema)\b/i,
  /\bdesactiva(r)?\b[^.!?]{0,60}\b(reglas?|seguridad|filtros?)\b/i,
  /\b(prompt|instrucciones?)\s+(del\s+sistema|internas?|internos?)\b/i,
  /\brep[ií]teme\b[^.!?]{0,80}\binstrucciones\b/i,
] as const;

/** A question whose answer is a price. It does not need an interpreter. */
const PRICE_QUESTION = [
  /\bcu[aá]nto\b[^.!?]{0,20}\b(cuesta|vale|sale|cobran)\b/i,
  /\bprecio\b/i,
  /\bplan\s+(premium|pago|de\s+pago)\b/i,
  /\bd[ií]as?\s+de\s+prueba\b/i,
  /\bprueba\s+gratis\b/i,
  /\bes\s+gratis\b/i,
  /\bes\s+gratuito\b/i,
] as const;

/** A request to start or create, stated as an action rather than as a fact. */
const CREATION_REQUEST = [
  /\bc[oó]mo\s+(empiezo|empezar|comienzo|arranco)\b/i,
  /\bquiero\s+(empezar|comenzar|crear)\b/i,
  /\bcr[eé]a(r|me|mos)\b[^.!?]{0,60}\bp[aá]gina\b/i,
  /\bcrear\s+(una\s+)?p[aá]gina\b/i,
] as const;

function matchesAny(patterns: readonly RegExp[], message: string): boolean {
  return patterns.some((pattern) => pattern.test(message));
}

/**
 * The deterministic signals for a rule. Every field the classifier would have
 * inferred from a business fact is left empty ON PURPOSE: the fast path only
 * claims what the rule actually proves.
 */
function signalsFor(rule: DeterministicRule): VisitorSignals {
  const intent: IntentId =
    rule === "INSTRUCTION_OVERRIDE"
      ? "OTHER"
      : rule === "EXPLICIT_PRICE_QUESTION"
        ? "PRICING"
        : "START_CREATION";

  return {
    intents: [intent],
    business_type: null,
    primary_goal: null,
    secondary_goals: [],
    expressed_needs: [],
    explicit_objections: [],
    current_tools: [],
    technical_familiarity: "UNKNOWN",
    // Deterministic resolution does not guess how ready the visitor is. The
    // intent is enough for CA-4, which never reads readiness to decide.
    purchase_readiness: "UNKNOWN",
    // EXPLAIN is the safe action for all three rules: it asks nothing of the
    // product and can never become a broken promise. OFFER_GUEST_EDITOR would be
    // degraded to EXPLAIN anyway by CA-4's own boundary.
    next_best_action: "EXPLAIN",
    confidence: 1,
    unknown_fields:
      rule === "INSTRUCTION_OVERRIDE"
        ? ["intent", "business_type", "primary_goal"]
        : ["business_type", "primary_goal"],
    source: "DETERMINISTIC",
    fallback_reason: null,
  };
}

/**
 * Resolves a message locally, or returns `null` so the canonical classifier
 * runs. `null` is the SAFE answer and the default for everything not named here.
 */
export function resolveDeterministicSignals(input: string): DeterministicResolution | null {
  const message = input.trim();
  if (message === "") return null;
  if (URL_LIKE.test(message)) return null;
  if (CONTEXT_DEPENDENT.test(message)) return null;
  if (BUSINESS_FACT.test(message)) return null;

  // An instruction aimed at the model is refused as OTHER even when the same
  // message also asks a product question: no business answer can make obeying
  // the instruction safe, and OTHER is the vocabulary's own "not understood".
  if (matchesAny(INSTRUCTION_OVERRIDE, message)) {
    return { rule: "INSTRUCTION_OVERRIDE", signals: signalsFor("INSTRUCTION_OVERRIDE") };
  }

  const price = matchesAny(PRICE_QUESTION, message);
  const creation = matchesAny(CREATION_REQUEST, message);

  // Two competing interpretations is exactly the ambiguity the classifier
  // exists to resolve. The fast path must not choose for it.
  if (price && creation) return null;

  if (price) {
    return { rule: "EXPLICIT_PRICE_QUESTION", signals: signalsFor("EXPLICIT_PRICE_QUESTION") };
  }
  if (creation) {
    return { rule: "EXPLICIT_CREATION_REQUEST", signals: signalsFor("EXPLICIT_CREATION_REQUEST") };
  }
  return null;
}
