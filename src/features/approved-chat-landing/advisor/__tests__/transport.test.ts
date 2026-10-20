/**
 * CRIPQER CA-11 · the landing's transport, without a landing.
 *
 * The three properties the mounted surface depends on, each proved on the
 * transport itself so a browser is not needed to check them:
 *
 *  1. ONE conversation per mounted landing, created lazily and reused — the
 *     identity that makes three turns a conversation instead of three strangers.
 *  2. A failed start is not permanent: an explicit retry can open a new one.
 *  3. An aborted or overdue turn rejects, so the surface settles ERROR instead of
 *     waiting forever.
 */

import { describe, expect, it } from "vitest";

import {
  createLandingAdvisorTransport,
  type LandingAdvisorBindings,
} from "../transport";

function recorder() {
  const starts: number[] = [];
  const turns: { sessionId: string; message: string }[] = [];
  const bindings: LandingAdvisorBindings = {
    startSession: async () => {
      starts.push(starts.length + 1);
      return { session_id: `s-${starts.length}` };
    },
    askTurn: async (input) => {
      turns.push(input);
      return { ok: true, echo: input.message };
    },
  };
  return { bindings, starts, turns };
}

describe("CA-11 landing transport — conversation identity", () => {
  it("creates one session and reuses it for every turn", async () => {
    const { bindings, starts, turns } = recorder();
    const transport = createLandingAdvisorTransport(bindings);
    const controller = new AbortController();

    await transport({ text: "uno", signal: controller.signal });
    await transport({ text: "dos", signal: controller.signal });
    await transport({ text: "tres", signal: controller.signal });

    expect(starts).toHaveLength(1);
    expect(turns.map((turn) => turn.message)).toEqual(["uno", "dos", "tres"]);
    expect(new Set(turns.map((turn) => turn.sessionId))).toEqual(new Set(["s-1"]));
  });

  it("does not create a second session when two first turns start together", async () => {
    const { bindings, starts } = recorder();
    const transport = createLandingAdvisorTransport(bindings);
    const controller = new AbortController();

    await Promise.all([
      transport({ text: "uno", signal: controller.signal }),
      transport({ text: "dos", signal: controller.signal }),
    ]);

    expect(starts).toHaveLength(1);
  });

  it("lets a later turn recover after the session start failed", async () => {
    let attempts = 0;
    const turns: string[] = [];
    const transport = createLandingAdvisorTransport({
      startSession: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("network down");
        return { session_id: "recovered" };
      },
      askTurn: async (input) => {
        turns.push(input.sessionId);
        return {};
      },
    });
    const controller = new AbortController();

    await expect(transport({ text: "uno", signal: controller.signal })).rejects.toThrow(
      "network down",
    );
    await expect(transport({ text: "dos", signal: controller.signal })).resolves.toEqual({});

    expect(attempts).toBe(2);
    expect(turns).toEqual(["recovered"]);
  });
});

describe("CA-11 landing transport — abort and deadline", () => {
  it("does not call the server at all when the signal is already aborted", async () => {
    const { bindings, starts, turns } = recorder();
    const transport = createLandingAdvisorTransport(bindings);
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));

    await expect(transport({ text: "uno", signal: controller.signal })).rejects.toThrow(
      "cancelled",
    );
    expect(starts).toHaveLength(0);
    expect(turns).toHaveLength(0);
  });

  it("discards an answer that arrives after the visitor aborted", async () => {
    let release: (() => void) | null = null;
    const transport = createLandingAdvisorTransport(
      {
        startSession: async () => ({ session_id: "s-1" }),
        askTurn: async () => {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          return { answer: "late" };
        },
      },
      { timeoutMs: 5_000 },
    );
    const controller = new AbortController();

    const pending = transport({ text: "uno", signal: controller.signal });
    await Promise.resolve();
    controller.abort(new Error("cancelled"));
    // `release` is assigned inside the transport's promise executor; TS's
    // control-flow analysis cannot see that assignment from here, so the
    // callback is read through its declared union rather than narrowed to null.
    (release as (() => void) | null)?.();

    await expect(pending).rejects.toThrow("cancelled");
  });

  it("rejects a turn that never settles, so the surface cannot spin forever", async () => {
    const transport = createLandingAdvisorTransport(
      {
        startSession: async () => ({ session_id: "s-1" }),
        askTurn: () => new Promise<unknown>(() => {}),
      },
      { timeoutMs: 25 },
    );

    await expect(
      transport({ text: "uno", signal: new AbortController().signal }),
    ).rejects.toThrow("timed out");
  });
});
