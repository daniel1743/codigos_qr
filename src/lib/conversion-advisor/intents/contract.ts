/**
 * CRIPQER Conversion Advisor — CA-3 · listening contract.
 *
 * CA-3 UNDERSTANDS; it does not answer, recommend, create, publish, price or
 * register anyone. This module owns three things and nothing else:
 *
 *   1. the vocabulary (intents + customer signals) — a single source of truth;
 *   2. the STRICT validator applied to the model's JSON (unknown keys are
 *      rejected, not ignored: a valid JSON object is not a valid answer);
 *   3. the SAFE fallback used whenever the model cannot be trusted — an
 *      explicit "I don't know", never an invented interpretation.
 *
 * Two vocabularies live in CA-1 and are reused here rather than re-declared:
 * `ADVISOR_INTENT_IDS` and `ADVISOR_READINESS`.
 */

import {
  ADVISOR_INTENT_IDS,
  ADVISOR_READINESS,
  AdvisorProviderError,
  parseIntentJson,
} from "../provider.server";

export const INTENT_IDS = ADVISOR_INTENT_IDS;
export type IntentId = (typeof INTENT_IDS)[number];

export const PURCHASE_READINESS = ADVISOR_READINESS;
export type PurchaseReadiness = (typeof PURCHASE_READINESS)[number];

export const TECHNICAL_FAMILIARITY = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "UNKNOWN"] as const;
export type TechnicalFamiliarity = (typeof TECHNICAL_FAMILIARITY)[number];

export const NEXT_BEST_ACTIONS = [
  "EXPLAIN",
  "ASK_ONE_QUESTION",
  "SUGGEST_FEATURE",
  "OFFER_GUEST_EDITOR",
  "OFFER_HELP",
  "NONE",
] as const;
export type NextBestAction = (typeof NEXT_BEST_ACTIONS)[number];

/** Bounds. A signal list is a summary of ONE message, not a dossier. */
export const SIGNAL_LIMITS = {
  maxIntents: 3,
  maxSecondaryGoals: 3,
  maxNeeds: 4,
  maxObjections: 4,
  maxTools: 5,
  maxUnknownFields: 8,
  maxShortText: 120,
  maxBusinessType: 60,
} as const;

export interface VisitorSignals {
  readonly intents: readonly IntentId[];
  readonly business_type: string | null;
  readonly primary_goal: string | null;
  readonly secondary_goals: readonly string[];
  readonly expressed_needs: readonly string[];
  readonly explicit_objections: readonly string[];
  readonly current_tools: readonly string[];
  readonly technical_familiarity: TechnicalFamiliarity;
  readonly purchase_readiness: PurchaseReadiness;
  readonly next_best_action: NextBestAction;
  readonly confidence: number;
  readonly unknown_fields: readonly string[];
  /**
   * Where this result came from. `DETERMINISTIC` (CA-12) means a local rule
   * proved the intent without consulting the provider; the vocabulary is the
   * same, and the fields carry exactly what the rule proved and nothing else.
   */
  readonly source: "MODEL" | "DETERMINISTIC" | "FALLBACK";
  readonly fallback_reason: string | null;
}

const SIGNAL_KEYS = new Set([
  "intents",
  "business_type",
  "primary_goal",
  "secondary_goals",
  "expressed_needs",
  "explicit_objections",
  "current_tools",
  "technical_familiarity",
  "purchase_readiness",
  "next_best_action",
  "confidence",
  "unknown_fields",
]);

function fail(detail: string): never {
  throw new AdvisorProviderError("SCHEMA_INVALID", { detail });
}

function readShortText(value: unknown, field: string, max: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") fail(`${field} must be a string or null`);
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > max) fail(`${field} is too long`);
  return trimmed;
}

function readShortTextList(value: unknown, field: string, maxItems: number): readonly string[] {
  if (!Array.isArray(value)) fail(`${field} must be an array`);
  if (value.length > maxItems) fail(`${field} has too many items`);
  return value.map((item) => {
    const text = readShortText(item, field, SIGNAL_LIMITS.maxShortText);
    if (text === null) fail(`${field} has an empty item`);
    return text;
  });
}

function readEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    fail(`${field} is not an allowed value`);
  }
  return value as T;
}

/**
 * Strict validation of the listening JSON. Rejects unknown keys, out-of-range
 * confidence, over-long text, oversized lists and any enum not in the
 * vocabulary. Never mutates the input and never returns a partial result.
 */
export function parseVisitorSignals(text: string): VisitorSignals {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("completion is not valid JSON");
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    fail("payload is not an object");

  const record = raw as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!SIGNAL_KEYS.has(key)) fail(`unexpected key: ${key}`);
  }

  // `intents` is reused from CA-1: same ids, same cap, same rejection rule.
  const shared = parseIntentJson(
    JSON.stringify({
      intents: record["intents"],
      purchase_readiness: record["purchase_readiness"],
      confidence: record["confidence"],
      unknown_fields: record["unknown_fields"],
    }),
  );

  const confidence = record["confidence"];
  if (
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    fail("confidence must be a number in [0,1]");
  }

  return {
    intents: shared.intents as readonly IntentId[],
    business_type: readShortText(
      record["business_type"],
      "business_type",
      SIGNAL_LIMITS.maxBusinessType,
    ),
    primary_goal: readShortText(record["primary_goal"], "primary_goal", SIGNAL_LIMITS.maxShortText),
    secondary_goals: readShortTextList(
      record["secondary_goals"],
      "secondary_goals",
      SIGNAL_LIMITS.maxSecondaryGoals,
    ),
    expressed_needs: readShortTextList(
      record["expressed_needs"],
      "expressed_needs",
      SIGNAL_LIMITS.maxNeeds,
    ),
    explicit_objections: readShortTextList(
      record["explicit_objections"],
      "explicit_objections",
      SIGNAL_LIMITS.maxObjections,
    ),
    current_tools: readShortTextList(
      record["current_tools"],
      "current_tools",
      SIGNAL_LIMITS.maxTools,
    ),
    technical_familiarity: readEnum(
      record["technical_familiarity"],
      "technical_familiarity",
      TECHNICAL_FAMILIARITY,
    ),
    purchase_readiness: shared.purchase_readiness as PurchaseReadiness,
    next_best_action: readEnum(record["next_best_action"], "next_best_action", NEXT_BEST_ACTIONS),
    confidence,
    unknown_fields: shared.unknown_fields,
    source: "MODEL",
    fallback_reason: null,
  };
}

/**
 * The safe answer when the model cannot be trusted. It carries no
 * interpretation at all: `OTHER` + `UNKNOWN` and `NONE` — "I did not
 * understand", which CA-4 may turn into one clarifying question, and which can
 * never turn into a sales claim.
 */
export function unknownSignals(reason: string): VisitorSignals {
  return {
    intents: ["OTHER"],
    business_type: null,
    primary_goal: null,
    secondary_goals: [],
    expressed_needs: [],
    explicit_objections: [],
    current_tools: [],
    technical_familiarity: "UNKNOWN",
    purchase_readiness: "UNKNOWN",
    next_best_action: "NONE",
    confidence: 0,
    unknown_fields: ["intent", "business_type", "primary_goal"],
    source: "FALLBACK",
    fallback_reason: reason,
  };
}

/**
 * Whether an action may be OFFERED to a visitor today. `next_best_action` is
 * what the model believes is useful; this is what the product can actually
 * deliver. The Guest Editor is still an unintegrated dependency (CA-2,
 * `crear_pagina`: PARTIAL / INTEGRATION_NOT_VERIFIED), so the advisor must not
 * promise an editor that this build does not open.
 */
export function isActionOfferableToday(action: NextBestAction): boolean {
  return action !== "OFFER_GUEST_EDITOR";
}

/** Actions offered today, derived once so no caller re-derives the rule. */
export const OFFERABLE_ACTIONS_TODAY: readonly NextBestAction[] =
  NEXT_BEST_ACTIONS.filter(isActionOfferableToday);
