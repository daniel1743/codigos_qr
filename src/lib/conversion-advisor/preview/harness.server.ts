/**
 * CRIPQER Conversion Advisor — CA-7.3A · the isolated preview harness.
 *
 * SERVER-ONLY, and mounted NOWHERE. It is the driver behind an independent
 * preview surface: it owns one fictional conversation, injects a MOCK provider
 * transport, and runs each turn through the REAL pipeline —
 *
 *   runConversationalTurn (CA-7.1B, which reserves CA-8 and calls CA-3 + CA-4)
 *     → adaptAdvisorToAgentResponse (CA-7.2)
 *     → preview view model (what a surface may show)
 *
 * — and nothing here reimplements any of those steps. There is no second
 * classifier, no second advisor, no copy of the catalog and no second memory:
 * CA-6's session store IS the memory, CA-8's guard IS the budget, CA-5's
 * allowlist IS the only thing that decides an action.
 *
 * WHY A HARNESS AND NOT A ROUTE. Mounting the preview on a public route would
 * mean editing `src/routes/**`, which this phase forbids, and would put an
 * uncertified advisor in front of visitors. The harness gives the same journey —
 * a message in, a rendered response out — without a route. The brief says so
 * directly: "No añadir rutas si el arnés funciona sin ellas."
 *
 * ISOLATION, in the order it matters:
 *  · `fetchImpl` is injected. Nothing here calls the global `fetch`, so no
 *    request can leave the process; a test proves it by stubbing `fetch` to
 *    throw and watching the turn still complete.
 *  · The provider config is ALWAYS explicit. `runConversationalTurn` reads the
 *    real `process.env` only when its `config` is `undefined`; this harness
 *    never passes `undefined`, so no real key is ever read. The default is a
 *    fictional key against a `.invalid` host.
 *  · The guard is injected too, over its own in-memory ledger with the caller's
 *    limits. `getAdvisorGuard()` — which fixes its limits from the real
 *    environment for the life of the process — is deliberately never called.
 */

import { adaptAdvisorToAgentResponse } from "../integration/landing-adapter";
import { runConversationalTurn, startAdvisorSession } from "../integration/turn.server";
import { createAdvisorGuard, type AdvisorGuard } from "../guardrails/guard.server";
import { createInMemoryGuardrailLedger, type AdvisorMetrics } from "../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS, type AdvisorLimits } from "../guardrails/limits";
import type { AdvisorDeps, AdvisorProviderConfig } from "../provider.server";
import { SESSION_LIMITS } from "../session/context";
import { getSession } from "../session/store.server";
import type { AgentResponse } from "../../../features/approved-chat-landing/types/cripqer";
import {
  advisorPreviewMessage,
  refusedPreviewMessage,
  settledVisitorMessage,
  visitorPreviewMessage,
  type PreviewMessage,
  type PreviewStatus,
} from "./view-model";

/* ============================== the config ============================== */

/**
 * The default provider configuration, used whenever the caller does not supply
 * one. The key is fictional and the host is `.invalid` (a TLD reserved for
 * documentation, which can never resolve), so even a wiring mistake could not
 * reach a real provider.
 */
export const FICTIONAL_PREVIEW_CONFIG: AdvisorProviderConfig = {
  apiKey: "sk-preview-FICTIONAL-NOT-A-REAL-KEY",
  baseUrl: "https://preview.invalid/v1",
  model: "deepseek-flash",
  timeoutMs: 5_000,
  maxOutputTokens: 400,
  maxRetries: 0,
  retryBaseDelayMs: 1,
};

/* =============================== results ================================ */

export interface PreviewTurnResult {
  /** False only for a turn refused before anything could be consulted. */
  readonly ok: boolean;
  readonly status: PreviewStatus;
  /** The safe note the surface shows, or `null`. Never an internal reason. */
  readonly note: string | null;
  /** CA-7.1B's fixed refusal sentence, when the turn was refused. */
  readonly detail: string | null;
  /** The adapted landing response, or `null` on a refusal. */
  readonly response: AgentResponse | null;
  readonly turnsUsed: number;
  readonly turnsRemaining: number;
}

export interface PreviewHarnessOptions {
  /**
   * An explicit guard. When omitted, one is built over an ISOLATED in-memory
   * ledger with `limits`. The shared process guard is never used.
   */
  readonly guard?: AdvisorGuard;
  /** Limits for the isolated ledger built when `guard` is omitted. */
  readonly limits?: AdvisorLimits;
  /**
   * The provider configuration. `undefined` (or absent) uses
   * `FICTIONAL_PREVIEW_CONFIG`; an explicit `null` means "not configured",
   * which makes no call and asks for no reservation. `process.env` is never
   * consulted either way.
   */
  readonly config?: AdvisorProviderConfig | null;
  /** The transport and clock seams. `fetchImpl` must be a mock in tests. */
  readonly providerDeps?: AdvisorDeps;
  readonly now?: () => number;
}

export interface PreviewHarness {
  readonly sessionId: string;
  /**
   * Sends one visitor message. The visitor's message is appended SYNCHRONOUSLY,
   * so `messages()` read before the returned promise settles shows the real
   * in-flight state (`PROCESSING`).
   */
  send(message: string): Promise<PreviewTurnResult>;
  messages(): readonly PreviewMessage[];
  lastStatus(): PreviewStatus | null;
  metrics(): AdvisorMetrics;
}

/* ================================ clock ================================= */

/**
 * A monotonic clock. Latency is measured by CA-7.1B from this, so it must
 * advance between reads; a frozen clock would report every call as 0 ms.
 */
export function makeClock(start = 1_700_000_000_000, step = 5): () => number {
  let t = start;
  return () => {
    const value = t;
    t += step;
    return value;
  };
}

/* ============================== the harness ============================= */

export function createPreviewHarness(options: PreviewHarnessOptions = {}): PreviewHarness {
  const now = options.now ?? makeClock();
  const limits = options.limits ?? DEFAULT_ADVISOR_LIMITS;
  const guard = options.guard ?? createAdvisorGuard(limits, createInMemoryGuardrailLedger(limits));
  const config = options.config === undefined ? FICTIONAL_PREVIEW_CONFIG : options.config;
  const providerDeps = options.providerDeps ?? {};

  // CA-6's own session, on the injected clock. The id identifies a
  // CONVERSATION; it authorises nothing.
  const sessionId = startAdvisorSession(now()).session_id;

  const messages: PreviewMessage[] = [];
  let turn = 0;

  function send(message: string): Promise<PreviewTurnResult> {
    turn += 1;
    const visitorId = `v${turn}`;
    const advisorId = `a${turn}`;
    const index = messages.length;
    const visitor = visitorPreviewMessage(visitorId, message);
    messages.push(visitor);

    return (async (): Promise<PreviewTurnResult> => {
      // The REAL guarded turn. CA-8 reservations, CA-3 understanding and CA-4
      // advice all happen inside this one call; the provider transport is the
      // injected mock and nothing else.
      const run = await runConversationalTurn(
        { sessionId, message },
        { config, guard, providerDeps, now },
      );

      const session = getSession(sessionId, now());
      const turnsUsed = session?.context.turns_total ?? 0;
      const turnsRemaining = SESSION_LIMITS.maxTurnsTotal - turnsUsed;

      if (!run.ok) {
        // Refused before anything could be consulted: no TurnOutcome exists, so
        // the adapter is not called and the surface explains the refusal with
        // CA-7.1B's own fixed sentence.
        messages[index] = settledVisitorMessage(visitor, "REFUSED");
        messages.push(refusedPreviewMessage(advisorId, run.detail));
        return {
          ok: false,
          status: "REFUSED",
          note: null,
          detail: run.detail,
          response: null,
          turnsUsed,
          turnsRemaining,
        };
      }

      // The REAL CA-7.2 adapter. `actions` is always `[]` by its own decision.
      const response = adaptAdvisorToAgentResponse(run.outcome);
      const advisor = advisorPreviewMessage(advisorId, response, run.outcome);
      messages[index] = settledVisitorMessage(visitor, advisor.status);
      messages.push(advisor);

      return {
        ok: true,
        status: advisor.status,
        note: advisor.note,
        detail: null,
        response,
        turnsUsed,
        turnsRemaining,
      };
    })();
  }

  return {
    sessionId,
    send,
    messages: () => messages,
    lastStatus: () => {
      const last = messages[messages.length - 1];
      return last ? last.status : null;
    },
    metrics: () => guard.metrics(),
  };
}
