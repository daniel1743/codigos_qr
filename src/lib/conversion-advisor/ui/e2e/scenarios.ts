/**
 * CRIPQER Conversion Advisor — CA-7.4-C · the scenario vocabulary.
 *
 * A scenario names WHICH REAL PIPELINE CONDITION a browser turn should meet. It
 * is not a canned answer: every scenario below is produced by running the
 * existing pipeline (CA-7.1B → CA-8 → CA-3 → CA-4 → CA-6) and projecting its
 * real outcome through CA-7.4-A. The scenario only chooses the input conditions
 * the pipeline reacts to — a provider response script, a guard limit, a missing
 * configuration.
 *
 * Pure data, no imports, so both the browser-facing host and the Node test can
 * share the exact same list without either pulling in the other's environment.
 */

export const ADVISOR_E2E_SCENARIOS = [
  /** A healthy turn: grounded reply, no degradation. → ANSWERED */
  "answered",
  /** The listening call reports valid signals but NO usage. → DEGRADED */
  "degraded",
  /** No provider configured: CA-4's own safe reply, no call, no reservation. → FALLBACK */
  "fallback",
  /** The guard's emergency stop denies the reservation before any call. → REFUSED */
  "refused",
  /** The host answers with a payload OUTSIDE the contract, on purpose. → ERROR */
  "malformed",
  /** The host's HTTP layer fails, so the transport rejects. → ERROR */
  "transport-error",
  /** The provider never answers in time, so the turn can be observed in flight. */
  "slow",
  /** The provider answers LATE, ignoring the abort, after the visitor cancelled. */
  "delayed-answer",
  /** The model's reply is hostile markup, to test what the surface renders. */
  "hostile",
  /**
   * The FIRST turn fails at the transport, later turns succeed — the shape a
   * retry needs. A provider failure alone would NOT do: it yields FALLBACK, not
   * a retryable ERROR, so nothing would offer a retry to press.
   */
  "recover",
  /**
   * The model proposes HELP for a grounded turn: CA-5 resolves it to the ONE
   * executable action, OPEN_HELP, and CA-7.4-A projects it with `/help`. The
   * surface must still wait for an explicit click (CA-11).
   */
  "help",
  /**
   * The conversation's OWN guard budget is two provider requests. A healthy
   * turn costs two, so the FIRST turn is answered and the SECOND — in the same
   * conversation — is denied by CA-8. This is the scenario that makes the
   * per-conversation guard observable: a guard rebuilt on every turn would give
   * the second turn a fresh budget and answer it, so this scenario is what
   * fails if the accounting ever stops accumulating.
   */
  "budget",
] as const;

export type AdvisorE2eScenario = (typeof ADVISOR_E2E_SCENARIOS)[number];

export function isAdvisorE2eScenario(value: unknown): value is AdvisorE2eScenario {
  return typeof value === "string" && (ADVISOR_E2E_SCENARIOS as readonly string[]).includes(value);
}
