/**
 * CRIPQER Conversion Advisor — CA-7.1B · server function entry point.
 *
 * SERVER-ONLY. CA-11 mounted it: the approved conversational landing reaches
 * `askAdvisorUiTurnFn` through `approved-chat-landing/advisor/transport.ts`,
 * whose default bindings import this module dynamically. No route other than
 * the review surface (`/landing-chat-parity`) and no public entry point reaches
 * it, and the provider, the ledger and the credential stay behind the dynamic
 * imports inside each handler.
 *
 * Why `createServerFn` at all, when `turn.server.ts` is already the logic: the
 * repository's pattern is that a browser reaches server code through a typed
 * server function, and the validator runs on the client too — which is where a
 * malformed or oversized message is cheapest to refuse.
 *
 * The dynamic `import()` inside the handler is the repository's own convention
 * (`landing-bot/server.ts`): it keeps the provider, the ledger and the
 * credential out of any bundle that happens to reference this module.
 */

import { createServerFn } from "@tanstack/react-start";

import { validateTurnRequest, type PublicTurnResult, type TurnRequest } from "./contract";
import type { AdvisorUiResponse } from "./ui-contract";

/**
 * One conversational turn.
 *
 * The validator returns a FRESH, bounded `{ sessionId, message }`; anything else
 * the caller sent is refused rather than forwarded, so a visitor cannot supply
 * provider configuration, a privileged action or any other field.
 */
export const askAdvisorTurnFn = createServerFn({ method: "POST" })
  .validator((input: unknown): TurnRequest => {
    const validation = validateTurnRequest(input);
    if (!validation.ok) throw new Error(validation.detail);
    return validation.request;
  })
  .handler(async ({ data }): Promise<PublicTurnResult> => {
    const { runConversationalTurn } = await import("./turn.server");
    const { toPublicTurnResult } = await import("./contract");

    // CA-12: the PRODUCT entry point opts into the conservative first-turn fast
    // path. The canonical default stays two-call, so every internal caller and
    // the evaluation harness keep the baseline they were certified against.
    const run = await runConversationalTurn(data, { fastPath: "on" });
    if (!run.ok) throw new Error(run.detail);
    return toPublicTurnResult(run.outcome);
  });

/**
 * Opens a conversation. The id identifies a CONVERSATION, never a person, and
 * authorises nothing — CA-5 decides what may happen, and this handler exposes
 * no part of that decision.
 *
 * It takes no input on purpose: there is nothing a visitor could supply here
 * that the server would be tempted to trust.
 */
export const startAdvisorSessionFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ session_id: string; turns_remaining: number }> => {
    const { startAdvisorSession } = await import("./turn.server");
    return startAdvisorSession();
  },
);

/**
 * CA-11 · the turn entry point of the REAL product surface.
 *
 * It is the same canonical server path as `askAdvisorTurnFn` — one
 * `runConversationalTurn`, no duplicated orchestration — but answers with
 * CA-7.4-A's own `AdvisorUiResponse` instead of the CA-7.1B public summary. The
 * projection happens HERE, on the server, so the browser never receives the
 * server-side `TurnOutcome` (usage, latency, denial reasons, attempt counts),
 * and a refusal becomes the contract's typed REFUSED state instead of a thrown
 * error the surface could not classify.
 *
 * It never throws for a turn the pipeline refused: that is a legitimate state of
 * the conversation. Only a request that fails validation, or a transport failure
 * below it, rejects — and the surface already maps a rejection to ERROR.
 */
export const askAdvisorUiTurnFn = createServerFn({ method: "POST" })
  .validator((input: unknown): TurnRequest => {
    const validation = validateTurnRequest(input);
    if (!validation.ok) throw new Error(validation.detail);
    return validation.request;
  })
  .handler(async ({ data }): Promise<AdvisorUiResponse> => {
    const { runConversationalTurn } = await import("./turn.server");
    const { projectAdvisorTurn } = await import("./ui-projection");

    // CA-12: same conservative first-turn fast path as `askAdvisorTurnFn`.
    const run = await runConversationalTurn(data, { fastPath: "on" });
    if (run.ok) return projectAdvisorTurn({ kind: "turn", outcome: run.outcome });

    // A turn the pipeline refused is a legitimate state, not a transport error:
    // it is projected from the typed reason so the surface can show REFUSED.
    return projectAdvisorTurn({ kind: "refusal", reason: run.reason });
  });
