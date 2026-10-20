/**
 * CRIPQER Conversion Advisor — CONV-02 · the AssistantService seam.
 *
 * SERVER-ONLY. This is the ONE server function through which the canonical
 * `AssistantService` facade reaches the Conversion Advisor. It is deliberately
 * separate from `askAdvisorTurnFn` / `askAdvisorUiTurnFn` (which the internal
 * review surface keeps using) for two CONV-02 reasons:
 *
 *  1. It answers with a CLOSED union instead of throwing. The facade's provider
 *     has to turn a refusal into a product sentence; a thrown error would erase
 *     the typed reason and make the mapping depend on exception serialisation.
 *  2. It is additive. Nothing that already worked had to change to exist, so
 *     CONV-03 can switch `useCripqerSession` to the facade and back without
 *     touching the advisor's own surface.
 *
 * It still runs the SAME `runConversationalTurn`: there is one orchestrator, one
 * guard, one memory and one provider. No second LLM path exists here.
 *
 * It never throws for anything the visitor can cause, never returns usage, a
 * denial reason, a provider body, a stack or a credential — `PublicTurnResult`
 * is the only success payload and the failure variant carries a fixed, typed
 * code plus a fixed message.
 */

import { createServerFn } from "@tanstack/react-start";

import type { AssistantTurnResult } from "./contract";

export const askAdvisorAssistantFn = createServerFn({ method: "POST" })
  // The union below is the contract, so a malformed request must be ANSWERED,
  // not thrown. Validation therefore happens inside the handler, where its
  // typed refusal can be represented as `{ ok: false, code: "INVALID_INPUT" }`.
  .validator((input: unknown): unknown => input)
  .handler(async ({ data }): Promise<AssistantTurnResult> => {
    const { runConversationalTurn } = await import("./turn.server");
    const { toPublicTurnResult } = await import("./contract");

    try {
      // CA-12: the same conservative first-turn fast path as every product
      // entry point. The canonical default stays two-call.
      const run = await runConversationalTurn(data, { fastPath: "on" });
      if (!run.ok) return { ok: false, code: run.reason, message: run.detail };
      return { ok: true, data: toPublicTurnResult(run.outcome) };
    } catch {
      // A throw here is a defect, not a conversation state. It is reported as
      // the union's own catch-all with a fixed sentence: the exception's message
      // and stack stay server-side, because either can carry a body or a key.
      return {
        ok: false,
        code: "UNAVAILABLE",
        message: "El asesor no está disponible ahora mismo.",
      };
    }
  });
