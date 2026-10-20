/**
 * CRIPQER Conversion Advisor — CONV-02 · the landing's product snapshot.
 *
 * This is the ONE seam where the advisor is allowed to know the landing's
 * product state. It exists because the advisor's memory (CA-6) remembers the
 * CONVERSATION, not the page being built: without this snapshot the model asks
 * again for a business type the visitor already chose, and cannot phrase the
 * one question the landing is about to render as chips.
 *
 * HARD RULES
 *  · The snapshot is DATA, never authority. The model may read it and phrase a
 *    reply from it; it can never select a template, fill a context patch, open
 *    a drawer or create a page because of it.
 *  · Every id is validated against the REAL catalog at the edge. An unknown id
 *    is refused, not silently dropped: a payload that claims a template this
 *    product does not have is malformed, and a fail-closed turn is cheaper than
 *    a prompt built on a lie.
 *  · `readyForPage` from the client is IGNORED and recomputed here. Client
 *    booleans are hints, not facts.
 *  · Personal data is excluded by construction: there is no `name`, no
 *    `description`, no transcript and no session id in this shape.
 *
 * PURE: no server module, no environment variable, no network. It is imported
 * by the `createServerFn` validator, which also runs in the browser.
 */

import { businessTypes, channels } from "../../../features/approved-chat-landing/data/business";
import { templates } from "../../../features/approved-chat-landing/data/templates";
import type {
  BusinessContext,
  ChannelId,
  TemplateId,
} from "../../../features/approved-chat-landing/types/cripqer";

export const LANDING_CONTEXT_LIMITS = {
  /** The landing shows four cards at once; older ones are not needed. */
  maxLastShown: 4,
  maxIdChars: 64,
} as const;

export type LandingExpectedSlot = "type" | "goal" | "template" | "channel" | null;

export interface LandingContextSnapshot {
  readonly businessType: string | null;
  readonly goal: string | null;
  readonly channel: ChannelId | null;
  readonly selectedTemplateId: TemplateId | null;
  readonly lastShownTemplateIds: readonly TemplateId[];
  /**
   * Recalculated server-side by `deriveLandingReadiness`. The value the client
   * sent is accepted only as a boolean of the right type, never trusted.
   */
  readonly readyForPage: boolean;
  /**
   * Recalculated server-side from the facts. The client's value is checked for
   * shape only, then replaced: a derived fact cannot be asserted by the caller.
   */
  readonly expectedSlot: LandingExpectedSlot;
}

export type LandingContextValidation =
  | { readonly ok: true; readonly value: LandingContextSnapshot | null }
  | { readonly ok: false };

const CONTEXT_KEYS: readonly string[] = [
  "businessType",
  "goal",
  "channel",
  "selectedTemplateId",
  "lastShownTemplateIds",
  "readyForPage",
  "expectedSlot",
];

const BUSINESS_TYPE_IDS: ReadonlySet<string> = new Set(businessTypes.map((type) => type.id));
const CHANNEL_IDS: ReadonlySet<string> = new Set(channels.map((channel) => channel.id));
const TEMPLATE_ID_SET: ReadonlySet<string> = new Set(templates.map((template) => template.id));

const ID_PATTERN = /^[a-z0-9_]{1,64}$/;
const EXPECTED_SLOTS: readonly string[] = ["type", "goal", "template", "channel"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > LANDING_CONTEXT_LIMITS.maxIdChars) return null;
  return ID_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * Recomputes readiness from the snapshot's own product facts. The goal is
 * deliberately NOT part of it: whether a goal is required depends on the
 * business type's own question, which the landing evaluates locally before it
 * ever issues a create command. Being conservative here can only suppress a
 * prompt hint, never authorise a page.
 */
export function deriveLandingReadiness(
  snapshot: Pick<
    LandingContextSnapshot,
    "businessType" | "selectedTemplateId" | "channel"
  >,
): boolean {
  return (
    snapshot.businessType !== null &&
    snapshot.selectedTemplateId !== null &&
    snapshot.channel !== null
  );
}

/**
 * Validates a client-supplied snapshot. `null`/absent means "no product state",
 * which is a legitimate first turn. Anything present must be exact: one unknown
 * key, one non-catalog id or one bad enum refuses the whole turn.
 */
export function sanitizeLandingContext(input: unknown): LandingContextValidation {
  if (input === null || input === undefined) return { ok: true, value: null };
  if (!isRecord(input)) return { ok: false };

  for (const key of Object.keys(input)) {
    if (!CONTEXT_KEYS.includes(key)) return { ok: false };
  }

  const businessTypeRaw = input["businessType"] ?? null;
  const goalRaw = input["goal"] ?? null;
  const channelRaw = input["channel"] ?? null;
  const selectedRaw = input["selectedTemplateId"] ?? null;
  const shownRaw = input["lastShownTemplateIds"] ?? [];
  const readyRaw = input["readyForPage"] ?? false;
  const slotRaw = input["expectedSlot"] ?? null;

  if (businessTypeRaw !== null) {
    const id = boundedId(businessTypeRaw);
    if (id === null || !BUSINESS_TYPE_IDS.has(id)) return { ok: false };
  }
  if (goalRaw !== null) {
    const id = boundedId(goalRaw);
    // Goals are a closed list in the landing data, but they are plain strings
    // there (not a union). Bound the shape; the landing validates the label.
    if (id === null) return { ok: false };
  }
  if (channelRaw !== null) {
    const id = boundedId(channelRaw);
    if (id === null || !CHANNEL_IDS.has(id)) return { ok: false };
  }
  if (selectedRaw !== null) {
    const id = boundedId(selectedRaw);
    if (id === null || !TEMPLATE_ID_SET.has(id)) return { ok: false };
  }
  if (!Array.isArray(shownRaw) || shownRaw.length > LANDING_CONTEXT_LIMITS.maxLastShown) {
    return { ok: false };
  }
  const shown: TemplateId[] = [];
  for (const item of shownRaw) {
    const id = boundedId(item);
    if (id === null || !TEMPLATE_ID_SET.has(id)) return { ok: false };
    if (!shown.includes(id as TemplateId)) shown.push(id as TemplateId);
  }
  if (typeof readyRaw !== "boolean") return { ok: false };
  if (slotRaw !== null && (typeof slotRaw !== "string" || !EXPECTED_SLOTS.includes(slotRaw))) {
    return { ok: false };
  }

  const value: LandingContextSnapshot = {
    businessType: businessTypeRaw === null ? null : (boundedId(businessTypeRaw) as string),
    goal: goalRaw === null ? null : (boundedId(goalRaw) as string),
    channel: channelRaw === null ? null : (boundedId(channelRaw) as ChannelId),
    selectedTemplateId: selectedRaw === null ? null : (boundedId(selectedRaw) as TemplateId),
    lastShownTemplateIds: shown,
    readyForPage: false,
    expectedSlot: slotRaw as LandingExpectedSlot,
  };

  // Both derived facts are recomputed; the client's values are only checked.
  return {
    ok: true,
    value: {
      ...value,
      readyForPage: deriveLandingReadiness(value),
      expectedSlot: expectedSlotFromFacts(value),
    },
  };
}

/**
 * The landing's own projection. It never includes the business name or the
 * description: the advisor does not need them to hold a conversation, and they
 * are the most sensitive fields the landing holds.
 */
export function buildLandingContext(context: BusinessContext): LandingContextSnapshot {
  const shown = context.session.lastShownTemplates.slice(
    -LANDING_CONTEXT_LIMITS.maxLastShown,
  ) as TemplateId[];

  const snapshot: LandingContextSnapshot = {
    businessType: context.businessIdentity.type,
    goal: context.primaryGoal,
    channel: context.primaryChannel,
    selectedTemplateId: context.template.selectedTemplateId,
    lastShownTemplateIds: shown,
    readyForPage: false,
    expectedSlot: expectedSlotFor(context),
  };

  return { ...snapshot, readyForPage: deriveLandingReadiness(snapshot) };
}

/**
 * The one question the landing is about to render as chips, in the SAME order
 * the deterministic planner asks it. Sent so the model's prose and the chips do
 * not contradict each other; the chips themselves still come from the catalog.
 */
export function expectedSlotFor(context: BusinessContext): LandingExpectedSlot {
  return expectedSlotFromFacts({
    businessType: context.businessIdentity.type,
    goal: context.primaryGoal,
    channel: context.primaryChannel,
    selectedTemplateId: context.template.selectedTemplateId,
  });
}

/**
 * The same order the deterministic planner asks in: rubro → objetivo → estilo
 * → canal. Derived ONLY from catalog facts, so the server can recompute it
 * without trusting the landing.
 */
export function expectedSlotFromFacts(facts: {
  readonly businessType: string | null;
  readonly goal: string | null;
  readonly channel: ChannelId | null;
  readonly selectedTemplateId: TemplateId | null;
}): LandingExpectedSlot {
  if (!facts.businessType) return "type";
  const type = businessTypes.find((candidate) => candidate.id === facts.businessType) ?? null;
  if (!facts.goal && type?.goalOptions) return "goal";
  if (!facts.selectedTemplateId) return "template";
  if (!facts.channel) return "channel";
  return null;
}

/** A bounded, prompt-safe rendering of the snapshot: DATA, not instructions. */
export function describeLandingContext(snapshot: LandingContextSnapshot | null): string | null {
  if (snapshot === null) return null;
  const parts = [
    `rubro: ${snapshot.businessType ?? "sin definir"}`,
    `objetivo: ${snapshot.goal ?? "sin definir"}`,
    `canal: ${snapshot.channel ?? "sin definir"}`,
    `estilo elegido: ${snapshot.selectedTemplateId ?? "ninguno"}`,
    `estilos ya mostrados: ${
      snapshot.lastShownTemplateIds.length ? snapshot.lastShownTemplateIds.join(", ") : "ninguno"
    }`,
    `ficha lista para crear: ${snapshot.readyForPage ? "sí" : "no"}`,
    `pregunta pendiente: ${snapshot.expectedSlot ?? "ninguna"}`,
  ];
  return parts.join(" · ");
}
