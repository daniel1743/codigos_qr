/**
 * CRIPQER CA-11 · the transport of the REAL landing.
 *
 * The landing owns the input; this file owns the conversation's identity. The
 * Advisor's UI contract deliberately has no session field (`ui/types.ts` says
 * why), so the session id lives HERE — created once per mounted landing, reused
 * for every turn, never rendered, never stored.
 *
 * WHAT IS REAL: both calls go through the canonical server function module
 * (`askAdvisorUiTurnFn`, `startAdvisorSessionFn`), which runs the same
 * `runConversationalTurn` as the rest of the product. The landing does not
 * duplicate the orchestrator, call a provider or read a credential. The import is
 * DYNAMIC and sits inside the default bindings, so a host that injects its own
 * bindings (the product E2E, a unit test) never loads the server boundary at all,
 * and the review route's initial graph does not either.
 *
 * WHAT IT RETURNS: `Promise<unknown>`, exactly as the surface's contract asks.
 * The controller validates the payload; this file never narrows it.
 *
 * ABORT AND TIMEOUT. The surface aborts a turn when it is cancelled or unmounted.
 * The request may already be on the wire — a server function call cannot always
 * be recalled — so the signal is checked on both sides of the await and the
 * result is discarded by throwing. A turn also has a deadline: without one a
 * server that never answered would leave the surface spinning forever, which the
 * brief names as a failure. A timeout settles the turn as ERROR through the
 * controller's normal rejection path, which leaves the input usable and offers an
 * explicit retry.
 */

import type { AdvisorTransport } from "../../../lib/conversion-advisor/ui/types";

/** The two server calls, injectable so a test never needs a running app. */
export interface LandingAdvisorBindings {
  readonly startSession: () => Promise<{ readonly session_id: string }>;
  readonly askTurn: (input: {
    readonly sessionId: string;
    readonly message: string;
  }) => Promise<unknown>;
}

const SERVER_BINDINGS: LandingAdvisorBindings = {
  startSession: async () => {
    const { startAdvisorSessionFn } = await import(
      "../../../lib/conversion-advisor/integration/server"
    );
    return startAdvisorSessionFn();
  },
  askTurn: async ({ sessionId, message }) => {
    const { askAdvisorUiTurnFn } = await import(
      "../../../lib/conversion-advisor/integration/server"
    );
    return askAdvisorUiTurnFn({ data: { sessionId, message } });
  },
};

export interface LandingAdvisorTransportOptions {
  /** A turn's deadline. The default is generous; a test uses a short one. */
  readonly timeoutMs?: number;
}

export const LANDING_ADVISOR_TIMEOUT_MS = 30_000;

function aborted(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error("advisor turn aborted");
}

/**
 * Rejects when `promise` does not settle in time, or when the caller aborts.
 * The underlying request is NOT cancellable at this layer, and does not need to
 * be: the controller has already stopped listening, and a late answer that did
 * arrive would be dropped by its token.
 */
function withDeadline<T>(promise: Promise<T>, ms: number, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      fn();
    };
    const timer = setTimeout(() => {
      finish(() => reject(new Error("advisor turn timed out")));
    }, ms);
    const onAbort = (): void => {
      finish(() => reject(aborted(signal)));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
}

export function createLandingAdvisorTransport(
  bindings: LandingAdvisorBindings = SERVER_BINDINGS,
  options: LandingAdvisorTransportOptions = {},
): AdvisorTransport {
  const timeoutMs = options.timeoutMs ?? LANDING_ADVISOR_TIMEOUT_MS;

  /**
   * One promise, created lazily by the first turn and reused by every later one.
   * A rapid pair of submits therefore cannot create two conversations: the
   * second caller awaits the same promise.
   *
   * A FAILED start is cleared, so a manual retry can start a fresh conversation
   * instead of being poisoned forever by one network failure.
   */
  let session: Promise<string> | null = null;

  function sessionId(): Promise<string> {
    session ??= bindings.startSession().then(
      (handle) => handle.session_id,
      (error: unknown) => {
        session = null;
        throw error;
      },
    );
    return session;
  }

  return async ({ text, signal }) => {
    if (signal.aborted) throw aborted(signal);

    return withDeadline(
      (async () => {
        const id = await sessionId();
        if (signal.aborted) throw aborted(signal);
        const response = await bindings.askTurn({ sessionId: id, message: text });
        if (signal.aborted) throw aborted(signal);
        return response;
      })(),
      timeoutMs,
      signal,
    );
  };
}
