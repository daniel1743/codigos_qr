/**
 * CRIPQER Conversion Advisor — CA-4 · strategy engine.
 *
 * Deterministic, side-effect free, and the ONLY place that decides:
 *   · which commercial strategy leads this turn,
 *   · which verified capabilities may be recommended,
 *   · which action may be suggested.
 *
 * The model does not choose any of those three. It receives a closed set and
 * writes the reply; CA-4's validator then rejects anything outside the set.
 * That is the difference between "grounded" and "the prompt asked nicely".
 */

import {
  CAPABILITY_CATALOG,
  type CapabilityRecord,
  type CapabilityStatus,
} from "../capabilities/catalog";
import {
  isActionOfferableToday,
  type IntentId,
  type NextBestAction,
  type VisitorSignals,
} from "../intents/contract";

/** The strategy IS the dominant intent — one vocabulary, not two. */
export type Strategy = IntentId;
export const STRATEGIES = [
  "DISCOVERY",
  "BUSINESS_NEED",
  "FEATURE_QUESTION",
  "COMPARISON",
  "PRICING",
  "OBJECTION",
  "START_CREATION",
  "EDITOR_HELP",
  "PREMIUM_INTEREST",
  "TECHNICAL_SUPPORT",
  "OTHER",
] as const satisfies readonly IntentId[];

/**
 * Which intent leads when a message carries several. Ordered by urgency for the
 * VISITOR (not for the sale): someone ready to act is never buried under an
 * explanation, someone blocked is unblocked, someone objecting is heard before
 * anything is offered.
 */
const PRECEDENCE: readonly IntentId[] = [
  "START_CREATION",
  "TECHNICAL_SUPPORT",
  "OBJECTION",
  "PRICING",
  "COMPARISON",
  "FEATURE_QUESTION",
  "PREMIUM_INTEREST",
  "EDITOR_HELP",
  "BUSINESS_NEED",
  "DISCOVERY",
  "OTHER",
];

/**
 * Same decision, from intents alone — so CA-5 can re-derive the strategy from
 * a response it received without duplicating the precedence table.
 */
export function primaryStrategyFromIntents(intents: readonly IntentId[]): Strategy {
  for (const candidate of PRECEDENCE) {
    if (intents.includes(candidate)) return candidate;
  }
  return "OTHER";
}

export function primaryStrategy(signals: VisitorSignals): Strategy {
  return primaryStrategyFromIntents(signals.intents);
}

/**
 * Candidate capabilities per intent, by catalog id. Every id here MUST exist in
 * the CA-2 catalog — a test enforces it, so a typo fails the build instead of
 * silently grounding the advisor on nothing.
 */
const CANDIDATES: Readonly<Record<IntentId, readonly string[]>> = {
  DISCOVERY: ["tarjetas_bio", "qr", "plan_free"],
  BUSINESS_NEED: ["tarjetas_bio", "catalogos", "qr", "analytics"],
  FEATURE_QUESTION: [
    "qr",
    "qr_dinamico",
    "analytics",
    "catalogos",
    "ia_negocio",
    "tarjetas_bio",
    "enlace_personalizado",
    "dominio_personalizado",
    "bloques_no_disponibles",
  ],
  COMPARISON: ["tarjetas_bio", "qr_dinamico", "plan_free", "analytics"],
  PRICING: ["plan_free", "plan_premium", "marca_cripqer"],
  OBJECTION: ["plan_free", "tarjetas_bio", "crear_pagina"],
  START_CREATION: ["crear_pagina", "plan_free", "tarjetas_bio"],
  EDITOR_HELP: ["magic_editor", "tarjetas_bio", "tipos_de_pagina"],
  PREMIUM_INTEREST: ["plan_premium", "marca_cripqer", "early_access_visual", "plan_free"],
  TECHNICAL_SUPPORT: ["magic_editor", "bloques_no_disponibles", "dashboard"],
  OTHER: ["plan_free"],
};

export const MAX_RECOMMENDATIONS = 3;

/** How each catalog status may be treated in a public reply (CA4_3). */
export const STATUS_POLICY: Readonly<
  Record<CapabilityStatus, "RECOMMEND" | "EXPLAIN_LIMITS" | "MENTION_AS_FUTURE" | "EXCLUDE">
> = {
  AVAILABLE_VERIFIED: "RECOMMEND",
  PARTIAL: "EXPLAIN_LIMITS",
  IN_TESTING: "EXCLUDE",
  PLANNED: "MENTION_AS_FUTURE",
  NOT_AVAILABLE: "EXCLUDE",
  UNKNOWN: "EXCLUDE",
};

/**
 * The capabilities this turn may talk about. Deterministic order (candidate
 * order, then catalog order), never more than `MAX_RECOMMENDATIONS`.
 */
export function selectCapabilities(signals: VisitorSignals): readonly CapabilityRecord[] {
  const strategy = primaryStrategy(signals);
  const wanted = CANDIDATES[strategy];
  const selected: CapabilityRecord[] = [];

  for (const id of wanted) {
    if (selected.length >= MAX_RECOMMENDATIONS) break;
    const record = CAPABILITY_CATALOG.find((entry) => entry.capability_id === id);
    if (!record) continue;
    const policy = STATUS_POLICY[record.status];
    // Only what can be recommended (or recommended with its limits) is handed
    // to the model as a recommendation candidate.
    if (policy !== "RECOMMEND" && policy !== "EXPLAIN_LIMITS") continue;
    selected.push(record);
  }
  return selected;
}

/** Plans the reply must not contradict, derived from the selected records. */
export function allowedPlansFor(records: readonly CapabilityRecord[]): readonly string[] {
  const plans = new Set<string>();
  for (const record of records) for (const plan of record.available_plans) plans.add(plan);
  return [...plans].sort();
}

export interface ActionDecision {
  readonly action: NextBestAction;
  readonly offerable: boolean;
  readonly reason: string;
}

/**
 * The action boundary. The listener's proposal is honoured only if the product
 * can actually deliver it today; otherwise it degrades to a safe alternative
 * instead of becoming a broken promise.
 */
export function decideAction(signals: VisitorSignals): ActionDecision {
  const proposed = signals.next_best_action;
  if (isActionOfferableToday(proposed)) {
    return { action: proposed, offerable: true, reason: "ACTION_ALLOWED" };
  }
  if (proposed === "OFFER_GUEST_EDITOR") {
    // CA-2 marks `crear_pagina` as PARTIAL / INTEGRATION_NOT_VERIFIED: the
    // guest editor is another team's in-flight work. Offer help instead of an
    // editor this build may not open.
    return { action: "EXPLAIN", offerable: false, reason: "GUEST_EDITOR_NOT_INTEGRATED" };
  }
  return { action: "NONE", offerable: false, reason: "ACTION_NOT_OFFERABLE" };
}
