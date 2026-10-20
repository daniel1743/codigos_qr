/**
 * CRIPQER Conversion Advisor — CA-5 · deterministic authorization.
 *
 * Inputs the caller owns: the CA-4 response, the catalog, integration evidence
 * and surface feature flags. Inputs the model owns: none. There is no field in
 * any model output that can enable an action, and every unknown is DENIED —
 * never ALLOWED.
 *
 * A descriptor is a proposal. CA-7 must call `revalidateDescriptor()` again at
 * the moment it presents or activates anything.
 */

import { type AdvisorResponse } from "../advisor/response";
import { primaryStrategyFromIntents } from "../advisor/strategy";
import { CAPABILITY_CATALOG } from "../capabilities/catalog";
import {
  ACTION_REGISTRY,
  EXECUTABLE_NAVIGATION_DESTINATIONS,
  nextBestActionToActionId,
  validateDescriptor,
  type ActionDescriptor,
  type ActionStatus,
} from "./registry";

/** Evidence that a surface is really wired in THIS environment and build. */
export interface IntegrationEvidence {
  readonly guestEditor: {
    readonly route: string;
    readonly verified: boolean;
    readonly verified_at: string | null;
    readonly environment: string | null;
    readonly evidence_ref: string | null;
  };
}

export interface ActionContext {
  /** Surface flags, owned by the server. A flag absent or false means disabled. */
  readonly surfaceFlags?: Readonly<Record<string, boolean>>;
  readonly integrationEvidence?: IntegrationEvidence | undefined;
  /** Template ids the UI surface actually has. Absent = cannot verify. */
  readonly knownTemplateIds?: readonly string[] | undefined;
  readonly requestedTemplateId?: string | null;
  readonly now?: Date;
  /** Integration evidence older than this needs re-verification. */
  readonly maxEvidenceAgeDays?: number;
}

export interface ActionDecision {
  readonly descriptor: ActionDescriptor;
  readonly status: ActionStatus;
  readonly reason_code: string;
  readonly problems: readonly string[];
}

export const DEFAULT_MAX_EVIDENCE_AGE_DAYS = 30;

const noneDescriptor = (reason: string, status: ActionStatus = "DENIED"): ActionDecision => ({
  descriptor: {
    action_id: "NONE",
    action_type: ACTION_REGISTRY.NONE.kind,
    status,
    label: "",
    capability_ids: [],
    destination_id: null,
    reason_code: reason,
  },
  status,
  reason_code: reason,
  problems: [],
});

function evidenceIsFresh(evidence: IntegrationEvidence, now: Date, maxAgeDays: number): boolean {
  if (!evidence.guestEditor.verified_at) return false;
  const verifiedAt = Date.parse(evidence.guestEditor.verified_at);
  if (Number.isNaN(verifiedAt)) return false;
  const ageDays = (now.getTime() - verifiedAt) / 86_400_000;
  return ageDays >= 0 && ageDays <= maxAgeDays;
}

/**
 * The single authorization entry point. Deterministic, side-effect free and
 * total: it always returns a decision.
 */
export function resolveAdvisorAction(
  response: AdvisorResponse,
  context: ActionContext = {},
): ActionDecision {
  const flags = context.surfaceFlags ?? {};

  // 1. An answer that was not grounded may not act.
  if (response.grounding_status !== "GROUNDED") return noneDescriptor("ADVISOR_NOT_GROUNDED");

  // 2. The capabilities it cited must exist and be sellable today.
  for (const id of response.relevant_capability_ids) {
    const record = CAPABILITY_CATALOG.find((entry) => entry.capability_id === id);
    if (!record) return noneDescriptor(`UNKNOWN_CAPABILITY:${id}`);
    if (record.status !== "AVAILABLE_VERIFIED" && record.status !== "PARTIAL") {
      return noneDescriptor(`CAPABILITY_NOT_SELLABLE:${id}`);
    }
  }

  // 3. Resolve the action id.
  //    An explicit SURFACE request selects the UI intent; otherwise the
  //    model-facing proposal is mapped through the audited table. The model
  //    cannot reach `context`, so it can never select the UI intent itself —
  //    which is why SHOW_TEMPLATE_PREVIEW is unreachable without a real request.
  const strategy = primaryStrategyFromIntents(response.detected_intents);
  const actionId =
    context.requestedTemplateId != null
      ? "SHOW_TEMPLATE_PREVIEW"
      : nextBestActionToActionId(response.suggested_action, strategy);
  const spec = ACTION_REGISTRY[actionId];

  if (spec.availability === "NOT_IMPLEMENTED")
    return noneDescriptor(`ACTION_NOT_IMPLEMENTED:${actionId}`, "UNAVAILABLE");

  const build = (
    status: ActionStatus,
    reason: string,
    extra: Pick<
      ActionDescriptor,
      "destination_id" | "verified_template_id" | "required_feature_flag"
    > = {
      destination_id: null,
    },
  ): ActionDecision => {
    const descriptor: ActionDescriptor = {
      action_id: actionId,
      action_type: spec.kind,
      status,
      label: spec.label,
      capability_ids: response.relevant_capability_ids,
      reason_code: reason,
      ...extra,
    };
    const verdict = validateDescriptor(descriptor);
    if (!verdict.ok) return noneDescriptor(`DESCRIPTOR_INVALID:${verdict.problems.join(",")}`);
    return { descriptor, status, reason_code: reason, problems: [] };
  };

  // 4. CA-10B · the one executable action. The destination is read from the
  //    REGISTRY, never from the response: `AdvisorResponse` has no destination
  //    field at all, and no model text is consulted here. The action is static,
  //    non-mutating navigation to a route that exists in this build, so it needs
  //    no flag, no evidence and no payload confirmation — the click is the
  //    confirmation.
  if (actionId === "OPEN_HELP") {
    const destination = spec.destination_id;
    if (destination === null || !EXECUTABLE_NAVIGATION_DESTINATIONS.includes(destination))
      return noneDescriptor("NAVIGATION_DESTINATION_NOT_EXECUTABLE", "UNAVAILABLE");
    return build("ALLOWED", "INTERNAL_NAVIGATION_ALLOWED", { destination_id: destination });
  }

  // 5. Conditional actions: the product decides, not the model.
  if (actionId === "OFFER_GUEST_EDITOR") {
    if (flags[spec.required_feature_flag ?? ""] !== true)
      return noneDescriptor("FLAG_DISABLED", "UNAVAILABLE");
    const evidence = context.integrationEvidence;
    if (!evidence) return noneDescriptor("EVIDENCE_MISSING", "NEEDS_VERIFICATION");
    if (!evidence.guestEditor.verified)
      return noneDescriptor("EVIDENCE_NOT_VERIFIED", "NEEDS_VERIFICATION");
    if (evidence.guestEditor.route !== spec.destination_id)
      return noneDescriptor("ROUTE_MISMATCH", "NEEDS_VERIFICATION");
    // The clock is read ONLY on this branch. The OPEN_HELP path above is
    // clock-free, so the projection that consumes it stays deterministic.
    const now = context.now ?? new Date();
    const maxAge = context.maxEvidenceAgeDays ?? DEFAULT_MAX_EVIDENCE_AGE_DAYS;
    if (!evidenceIsFresh(evidence, now, maxAge))
      return noneDescriptor("EVIDENCE_EXPIRED", "NEEDS_VERIFICATION");
    return build("ALLOWED", "INTEGRATION_VERIFIED", {
      destination_id: spec.destination_id,
      // The registry encodes "no flag" as null; the descriptor contract encodes
      // it as an absent property (`exactOptionalPropertyTypes` forbids an
      // explicit undefined). So the key is omitted, not widened to allow null.
      ...(spec.required_feature_flag !== null
        ? { required_feature_flag: spec.required_feature_flag }
        : {}),
    });
  }

  if (actionId === "SHOW_TEMPLATE_PREVIEW") {
    if (flags[spec.required_feature_flag ?? ""] !== true)
      return noneDescriptor("FLAG_DISABLED", "UNAVAILABLE");
    // Reaching here means the surface asked for a template (see step 3).
    const requested = context.requestedTemplateId as string;
    const known = context.knownTemplateIds;
    if (!known) return noneDescriptor("SURFACE_CANNOT_VERIFY_TEMPLATE", "NEEDS_VERIFICATION");
    if (!known.includes(requested)) return noneDescriptor("UNKNOWN_TEMPLATE", "DENIED");
    return build("ALLOWED", "TEMPLATE_VERIFIED", {
      destination_id: null,
      verified_template_id: requested,
      ...(spec.required_feature_flag !== null
        ? { required_feature_flag: spec.required_feature_flag }
        : {}),
    });
  }

  // 6. Informational actions and NONE: allowed once the answer is grounded.
  return build("ALLOWED", "INFORMATION_ONLY", { destination_id: null });
}

/**
 * Mandatory second check. CA-5 validates before proposing; CA-7 must validate
 * again before presenting or activating — evidence, flags and templates can all
 * change between the two moments.
 */
export function revalidateDescriptor(descriptor: ActionDescriptor): {
  readonly ok: boolean;
  readonly problems: readonly string[];
} {
  return validateDescriptor(descriptor);
}

/**
 * CA-10B · the second, STRICTER check, applied at the moment a descriptor is
 * about to become an executable UI action.
 *
 * `revalidateDescriptor` answers "is this a well-formed descriptor for a
 * registry action?". This answers the different question "may this descriptor
 * be EXECUTED?", and today exactly one answer exists: `OPEN_HELP` pointing at
 * the registry's own `/help`. Anything else — an informational action, a
 * conditional action, an unknown id, a destination that is merely allowlisted
 * as data — is refused. Pure and total; it never repairs a descriptor.
 */
export function revalidateExecutableAction(descriptor: ActionDescriptor): {
  readonly ok: boolean;
  readonly problems: readonly string[];
} {
  const problems: string[] = [...validateDescriptor(descriptor).problems];

  if (descriptor.action_id !== "OPEN_HELP") {
    problems.push(`action_not_executable:${String(descriptor.action_id)}`);
  } else {
    const canonical = ACTION_REGISTRY.OPEN_HELP;
    if (descriptor.action_type !== canonical.kind) problems.push("executable_kind_mismatch");
    if (descriptor.destination_id !== canonical.destination_id)
      problems.push("executable_destination_mismatch");
    if (
      descriptor.destination_id === null ||
      !EXECUTABLE_NAVIGATION_DESTINATIONS.includes(descriptor.destination_id)
    )
      problems.push("destination_not_executable");
  }

  return { ok: problems.length === 0, problems };
}

/** The research default the operator sees while the integration is unverified. */
export const EXPLAIN_ONLY_NOTICE =
  "Ahora mismo puedo explicarte cómo funciona, pero no abrir un editor por ti.";
