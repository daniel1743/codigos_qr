/**
 * CRIPQER Conversion Advisor — CA-5 · action registry.
 *
 * A closed allowlist and a DATA contract. Nothing here executes, navigates,
 * writes, or interprets anything: an ActionDescriptor is a typed suggestion
 * that a later surface (CA-7) must re-validate before acting on it.
 *
 * Vocabulary note (CA5_1): the model-facing vocabulary is CA-3's
 * `NextBestAction`. This registry is the PRODUCT-facing allowlist and is
 * deliberately finer grained. The mapping between them lives in
 * `nextBestActionToActionId()` and neither CA-3 nor CA-4 is modified.
 */

import { type NextBestAction } from "../intents/contract";

export const ACTION_IDS = [
  "EXPLAIN_FEATURE",
  "EXPLAIN_FREE_PREMIUM",
  "SHOW_EDITOR_HELP",
  "OPEN_HELP",
  "SHOW_TEMPLATE_PREVIEW",
  "OFFER_GUEST_EDITOR",
  "NONE",
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export const ACTION_KINDS = ["INFORMATION", "UI_INTENT", "NAVIGATION_INTENT", "NO_ACTION"] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

export type ActionAvailability = "AVAILABLE" | "CONDITIONAL" | "NOT_IMPLEMENTED";

export interface ActionSpec {
  readonly action_id: ActionId;
  readonly kind: ActionKind;
  readonly availability: ActionAvailability;
  /** Product-facing label. Never supplied by the model. */
  readonly label: string;
  /** The only destination this action may ever carry, if any. */
  readonly destination_id: string | null;
  /** Flag that must be enabled for the surface to materialise this action. */
  readonly required_feature_flag: string | null;
}

export const ACTION_REGISTRY: Readonly<Record<ActionId, ActionSpec>> = {
  EXPLAIN_FEATURE: {
    action_id: "EXPLAIN_FEATURE",
    kind: "INFORMATION",
    availability: "AVAILABLE",
    label: "Ver qué hace esta función",
    destination_id: null,
    required_feature_flag: null,
  },
  EXPLAIN_FREE_PREMIUM: {
    action_id: "EXPLAIN_FREE_PREMIUM",
    kind: "INFORMATION",
    availability: "AVAILABLE",
    label: "Comparar plan gratuito y de pago",
    destination_id: null,
    required_feature_flag: null,
  },
  SHOW_EDITOR_HELP: {
    action_id: "SHOW_EDITOR_HELP",
    kind: "INFORMATION",
    availability: "AVAILABLE",
    label: "Ver ayuda del editor",
    destination_id: null,
    required_feature_flag: null,
  },
  // CA-10B · the first executable action. Its destination is a REGISTRY
  // CONSTANT, never a value taken from the model or from a request payload;
  // the surface re-validates the descriptor before anything may be clicked.
  OPEN_HELP: {
    action_id: "OPEN_HELP",
    kind: "NAVIGATION_INTENT",
    availability: "AVAILABLE",
    label: "Abrir el centro de ayuda",
    destination_id: "/help",
    required_feature_flag: null,
  },
  SHOW_TEMPLATE_PREVIEW: {
    action_id: "SHOW_TEMPLATE_PREVIEW",
    kind: "UI_INTENT",
    availability: "CONDITIONAL",
    label: "Ver una plantilla",
    destination_id: null,
    required_feature_flag: "advisorTemplatePreview",
  },
  OFFER_GUEST_EDITOR: {
    action_id: "OFFER_GUEST_EDITOR",
    kind: "NAVIGATION_INTENT",
    availability: "CONDITIONAL",
    label: "Empezar gratis",
    destination_id: "/crear-tarjeta",
    required_feature_flag: "advisorGuestEditor",
  },
  NONE: {
    action_id: "NONE",
    kind: "NO_ACTION",
    availability: "AVAILABLE",
    label: "",
    destination_id: null,
    required_feature_flag: null,
  },
};

/** The complete set of destinations this module may ever name in a descriptor. */
export const ALLOWED_DESTINATIONS: readonly string[] = ["/crear-tarjeta", "/help"];

/**
 * CA-10B · the closed allowlist of destinations that may become an EXECUTABLE
 * navigation action. It is stricter than `ALLOWED_DESTINATIONS` on purpose:
 * naming a destination in a descriptor and being allowed to execute it are two
 * different permissions. Only `/help` — a static route that really exists in
 * this build — is executable today.
 */
export const EXECUTABLE_NAVIGATION_DESTINATIONS: readonly string[] = ["/help"];

/**
 * CA-3's proposal → CA-5's registry. Audited for every value of the existing
 * vocabulary; no value is left unmapped, and ASK_ONE_QUESTION maps to no UI
 * action because the question already lives in the reply text.
 */
export function nextBestActionToActionId(action: NextBestAction, strategy: string): ActionId {
  switch (action) {
    case "OFFER_GUEST_EDITOR":
      return "OFFER_GUEST_EDITOR";
    // CA-10B: the model's help proposal now resolves to the ONE executable
    // action. It still decides no destination — the registry does — and the
    // surface still requires an explicit click before anything happens.
    case "OFFER_HELP":
      return "OPEN_HELP";
    case "EXPLAIN":
    case "SUGGEST_FEATURE":
      return strategy === "PRICING" || strategy === "PREMIUM_INTEREST"
        ? "EXPLAIN_FREE_PREMIUM"
        : "EXPLAIN_FEATURE";
    case "ASK_ONE_QUESTION":
    case "NONE":
      return "NONE";
  }
}

/* ============================ the descriptor ============================ */

export const ACTION_STATUSES = ["ALLOWED", "DENIED", "UNAVAILABLE", "NEEDS_VERIFICATION"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

/**
 * DATA, not an order. Every field is validated against the registry before a
 * surface may act on it, and the surface must validate it AGAIN when consumed.
 */
export interface ActionDescriptor {
  readonly action_id: ActionId;
  readonly action_type: ActionKind;
  readonly status: ActionStatus;
  readonly label: string;
  readonly capability_ids: readonly string[];
  readonly destination_id: string | null;
  readonly reason_code: string;
  readonly verified_template_id?: string;
  readonly required_feature_flag?: string;
}

export const DESCRIPTOR_LIMITS = {
  maxCapabilityIds: 3,
  maxLabelChars: 60,
  maxTemplateIdChars: 64,
  maxReasonChars: 80,
} as const;

/** A template id is an opaque slug from the UI surface — never a URL or path. */
const TEMPLATE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

const DANGEROUS_PATTERNS: readonly { readonly what: string; readonly pattern: RegExp }[] = [
  { what: "javascript_url", pattern: /javascript\s*:/i },
  { what: "data_url", pattern: /data\s*:/i },
  { what: "blob_url", pattern: /blob\s*:/i },
  { what: "external_url", pattern: /https?:\/\/|\/\// },
  { what: "path_traversal", pattern: /\.\./ },
  { what: "encoded_traversal", pattern: /%2e|%2f|%5c/i },
  { what: "backslash", pattern: /\\/ },
  { what: "embedded_code", pattern: /[<>{}$`]/ },
  { what: "secret_like", pattern: /(sk-|api[_-]?key|token|password|bearer)/i },
];

export interface DescriptorVerdict {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

/** Deterministic validation of a descriptor against the registry. Pure. */
export function validateDescriptor(descriptor: ActionDescriptor): DescriptorVerdict {
  const problems: string[] = [];

  const spec = ACTION_REGISTRY[descriptor.action_id];
  if (!spec) return { ok: false, problems: [`unknown_action_id:${String(descriptor.action_id)}`] };
  if (spec.kind !== descriptor.action_type) problems.push("kind_mismatch");
  if (!ACTION_STATUSES.includes(descriptor.status)) problems.push("invalid_status");
  if (descriptor.label.length > DESCRIPTOR_LIMITS.maxLabelChars) problems.push("label_too_long");
  if (descriptor.reason_code.length > DESCRIPTOR_LIMITS.maxReasonChars)
    problems.push("reason_too_long");
  if (descriptor.capability_ids.length > DESCRIPTOR_LIMITS.maxCapabilityIds)
    problems.push("too_many_capabilities");

  if (descriptor.destination_id !== null) {
    if (spec.destination_id === null) problems.push("destination_not_allowed_for_action");
    else if (descriptor.destination_id !== spec.destination_id)
      problems.push("destination_mismatch");
    if (!ALLOWED_DESTINATIONS.includes(descriptor.destination_id))
      problems.push("destination_not_allowlisted");
  }

  if (descriptor.verified_template_id !== undefined) {
    if (spec.action_id !== "SHOW_TEMPLATE_PREVIEW") problems.push("template_id_on_wrong_action");
    else if (!TEMPLATE_ID_PATTERN.test(descriptor.verified_template_id))
      problems.push("template_id_malformed");
    else if (descriptor.verified_template_id.length > DESCRIPTOR_LIMITS.maxTemplateIdChars) {
      problems.push("template_id_too_long");
    }
  }

  for (const { what, pattern } of DANGEROUS_PATTERNS) {
    if (pattern.test(descriptor.destination_id ?? "")) problems.push(`destination_${what}`);
    if (pattern.test(descriptor.verified_template_id ?? "")) problems.push(`template_${what}`);
    if (pattern.test(descriptor.label)) problems.push(`label_${what}`);
  }

  return { ok: problems.length === 0, problems };
}
