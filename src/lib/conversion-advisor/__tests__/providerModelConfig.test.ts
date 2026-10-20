/**
 * CONV-02 · the advisor's model is its OWN variable.
 *
 * The hazard this file exists for: `DEEPSEEK_MODEL` is read by the fuxion,
 * landing-bot and support assistants too. Pinning the advisor by editing that
 * shared variable would have changed three other products in the same deploy.
 * `ADVISOR_MODEL` was added instead, and these tests hold the precedence and —
 * more importantly — the fact that `DEEPSEEK_MODEL` keeps its own meaning.
 *
 * The last test is end-to-end on purpose: it proves the variable reaches the
 * OUTBOUND BODY, not merely the config object, because a value that stops at
 * `readAdvisorProviderConfig` would still leave the transport calling the old
 * model.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { ADVISOR_DEFAULTS, readAdvisorProviderConfig } from "../provider.server";
import { createAdvisorGuard } from "../guardrails/guard.server";
import { createInMemoryGuardrailLedger } from "../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS } from "../guardrails/limits";
import { runConversationalTurn, startAdvisorSession } from "../integration/turn.server";

const KEY = "sk-test-NEVER-PRINTED";

const listenJson = JSON.stringify({
  intents: ["DISCOVERY"],
  business_type: null,
  primary_goal: null,
  secondary_goals: [],
  expressed_needs: [],
  explicit_objections: [],
  current_tools: [],
  technical_familiarity: "UNKNOWN",
  purchase_readiness: "UNKNOWN",
  next_best_action: "EXPLAIN",
  confidence: 0.8,
  unknown_fields: [],
});

const adviseJson = JSON.stringify({
  reply: "Te cuento lo que está verificado, sin inventar nada.",
  capability_ids: [],
  limitations: [],
});

const okResponse = (content: string) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    }),
    { status: 200 },
  );

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CONV-02 · model resolution precedence", () => {
  it("ADVISOR_MODEL wins over the shared DEEPSEEK_MODEL", () => {
    const config = readAdvisorProviderConfig({
      DEEPSEEK_API_KEY: KEY,
      DEEPSEEK_MODEL: "deepseek-chat",
      ADVISOR_MODEL: "deepseek-flash",
    });
    expect(config?.model).toBe("deepseek-flash");
  });

  it("falls back to the shared DEEPSEEK_MODEL when ADVISOR_MODEL is absent", () => {
    const config = readAdvisorProviderConfig({
      DEEPSEEK_API_KEY: KEY,
      DEEPSEEK_MODEL: "deepseek-chat",
    });
    expect(config?.model).toBe("deepseek-chat");
  });

  it("falls back to the approved default when neither is set", () => {
    expect(readAdvisorProviderConfig({ DEEPSEEK_API_KEY: KEY })?.model).toBe("deepseek-flash");
    expect(ADVISOR_DEFAULTS.model).toBe("deepseek-flash");
  });

  it("treats a whitespace-only ADVISOR_MODEL as absent, not as a model name", () => {
    const config = readAdvisorProviderConfig({
      DEEPSEEK_API_KEY: KEY,
      DEEPSEEK_MODEL: "deepseek-chat",
      ADVISOR_MODEL: "   ",
    });
    expect(config?.model).toBe("deepseek-chat");
  });

  it("does not change DEEPSEEK_MODEL's meaning for any other reader", () => {
    // `readAdvisorProviderConfig` is the only consumer of the env it is given;
    // the shared variable is left exactly as the caller set it.
    const env = {
      DEEPSEEK_API_KEY: KEY,
      DEEPSEEK_MODEL: "deepseek-chat",
      ADVISOR_MODEL: "deepseek-flash",
    };
    readAdvisorProviderConfig(env);
    expect(env.DEEPSEEK_MODEL).toBe("deepseek-chat");
    expect(env.ADVISOR_MODEL).toBe("deepseek-flash");
  });

  it("no key means no configuration, whatever model is named", () => {
    expect(readAdvisorProviderConfig({ ADVISOR_MODEL: "deepseek-flash" })).toBeNull();
  });
});

describe("CONV-02 · the variable reaches the outbound request", () => {
  it("a turn read from the process environment sends ADVISOR_MODEL in the body", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", KEY);
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://api.test.local");
    vi.stubEnv("DEEPSEEK_MODEL", "deepseek-chat");
    vi.stubEnv("ADVISOR_MODEL", "deepseek-flash");

    const bodies: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ""));
      return bodies.length === 1 ? okResponse(listenJson) : okResponse(adviseJson);
    });

    const guard = createAdvisorGuard(
      DEFAULT_ADVISOR_LIMITS,
      createInMemoryGuardrailLedger(DEFAULT_ADVISOR_LIMITS),
    );
    const sessionId = startAdvisorSession().session_id;

    const run = await runConversationalTurn(
      { sessionId, message: "¿Qué es CRIPQER?" },
      { guard, providerDeps: { fetchImpl: fetchImpl as never } },
    );

    expect(run.ok).toBe(true);
    expect(bodies).toHaveLength(2);
    for (const body of bodies) {
      expect(JSON.parse(body)).toMatchObject({ model: "deepseek-flash" });
      expect(body).not.toContain("deepseek-chat");
    }
  });
});
