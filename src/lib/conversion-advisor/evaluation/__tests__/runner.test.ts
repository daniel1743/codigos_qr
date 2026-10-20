/**
 * CA-9A — the harness, end to end, against the MOCK transport only.
 *
 * The brief fixes `provider: mock_only: true` for this phase, so this file is
 * the proof that the whole pipeline runs — CA-7.1B → CA-8 → CA-3 → CA-4 → CA-6 →
 * CA-7.4-A → scoring → cost — without a single real call. It asserts STRUCTURAL
 * facts (calls, contract validity, usage status, the cost-cap break), never that
 * the advisor answers WELL: the mock answers the shape, not the question, and
 * the report says so.
 */
import { describe, expect, it } from "vitest";

import { createJsonFileStore, createMemoryStore, runCase, runDataset } from "../runner.server";
import { createMockTransport, MOCK_CONFIG, MOCK_REPLY, mockDeps } from "../mock-transport.server";
import { CASE_PASS_THRESHOLD, type EvaluationCase } from "../types";
import { evalCase } from "./fixtures";

/** Two cases: one single-turn, one two-turn (so the memory path runs). */
const smallDataset: readonly EvaluationCase[] = [
  evalCase({ id: "RUN-1", turns: ["¿Qué es CRIPQER?"] }),
  evalCase({
    id: "RUN-2",
    category: "multi_turn_memory",
    turns: ["Tengo un restaurante en Providencia.", "¿Cómo me ayuda con eso?"],
    memory_terms: ["restaurante"],
  }),
];

/** The mock, with its usage inflated so the run crosses the token budget. */
const hugeUsageTransport = ((): typeof fetch => {
  const base = createMockTransport();
  return (async (input: unknown, init?: RequestInit) => {
    const response = await base(input as RequestInfo, init);
    const body = (await response.json()) as Record<string, unknown>;
    if (body["usage"] !== undefined) {
      body["usage"] = { prompt_tokens: 150_000, completion_tokens: 150_000 };
    }
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
})();

describe("CA-9A runner — one case through the real pipeline", () => {
  it("runs both turns, makes two calls per turn, and validates the contract", async () => {
    const run = await runCase(smallDataset[1] as EvaluationCase, { providerDeps: mockDeps() });

    expect(run.case_id).toBe("RUN-2");
    expect(run.observations).toHaveLength(2);
    expect(run.contract_ok).toBe(true);
    expect(run.contract_problems).toEqual([]);
    // One healthy turn = CA-3 understanding + CA-4 advice.
    expect(run.max_calls_in_one_turn).toBe(2);
    expect(run.provider_calls).toBe(4);
  });

  it("returns the mock's grounded reply, not a fallback", async () => {
    const run = await runCase(smallDataset[0] as EvaluationCase, { providerDeps: mockDeps() });
    const observation = run.observations[0];

    expect(observation?.reply).toBe(MOCK_REPLY);
    expect(observation?.grounding_status).toBe("GROUNDED");
    expect(observation?.refused).toBe(false);
    expect(observation?.error).toBe(false);
    expect(observation?.detected_intents).toContain("DISCOVERY");
    expect(observation?.consumption.usage_status).toBe("REPORTED");
  });

  it("reports measured tokens for a REPORTED call", async () => {
    const run = await runCase(smallDataset[0] as EvaluationCase, { providerDeps: mockDeps() });
    // Listen 220/60 + advise 320/120 = 280 + 440 = 720.
    expect(run.observations[0]?.consumption.input_tokens).toBe(540);
    expect(run.observations[0]?.consumption.output_tokens).toBe(180);
  });

  it("never reads the process environment when a config is injected", async () => {
    // The mock config's host is `.invalid`; if this test reaches the network it
    // fails loudly, which is the point: no real provider is contacted.
    const run = await runCase(smallDataset[0] as EvaluationCase, {
      config: MOCK_CONFIG,
      providerDeps: mockDeps(),
    });
    expect(run.provider_calls).toBe(2);
  });
});

describe("CA-9A runner — the whole dataset", () => {
  it("scores every case and stores the result locally", async () => {
    const store = createMemoryStore();
    const result = await runDataset(smallDataset, { providerDeps: mockDeps(), store });

    expect(result.cases.map((entry) => entry.case_id)).toEqual(["RUN-1", "RUN-2"]);
    expect(result.summary.cases_scored).toBe(2);
    expect(result.summary.contract_failures).toBe(0);
    expect(result.summary.production_writes).toBe(0);
    expect(result.transport).toBe("mock");
    expect(store.result).toBe(result);
  });

  it("produces no hard failures from the mock's claim-free reply", async () => {
    const result = await runDataset(smallDataset, { providerDeps: mockDeps() });
    expect(result.summary.cases_hard_failed).toBe(0);
    expect(result.verdict.abort).toBe(false);
    for (const entry of result.cases) expect(entry.score.hard_failures).toEqual([]);
  });

  it("accumulates the measured cost across the run", async () => {
    const result = await runDataset(smallDataset, { providerDeps: mockDeps() });
    // Three turns × two calls = six provider calls, all REPORTED.
    expect(result.cost.calls).toBe(6);
    expect(result.cost.unknown_settlements).toBe(0);
    expect(result.cost.input_tokens).toBe(3 * 540);
    expect(result.cost.output_tokens).toBe(3 * 180);
  });

  it("attaches a memory report only to the multi-turn case", async () => {
    const result = await runDataset(smallDataset, { providerDeps: mockDeps() });
    const byId = new Map(result.cases.map((entry) => [entry.case_id, entry]));
    expect(byId.get("RUN-1")?.memory).toBeNull();
    expect(byId.get("RUN-2")?.memory).not.toBeNull();
  });

  it("catches the mock repeating itself, proving the memory dimension has teeth", async () => {
    // The mock returns one fixed reply, so it asks the same question on both
    // turns. The evaluator must SEE that — otherwise the memory dimension would
    // be inert and the report's claim about it would be empty.
    const result = await runDataset(smallDataset, { providerDeps: mockDeps() });
    const multi = result.cases.find((entry) => entry.case_id === "RUN-2");
    expect(multi?.memory?.signal.repeated_question).not.toBeNull();
    expect(multi?.memory?.passed).toBe(false);
    // A memory finding is NOT a hard failure: it lowers a dimension, it does not
    // invalidate the case.
    expect(multi?.score.hard_failures).toEqual([]);
  });

  it("scores the mock's faithful answer above the pass threshold", async () => {
    const result = await runDataset(smallDataset, { providerDeps: mockDeps() });
    const single = result.cases.find((entry) => entry.case_id === "RUN-1");
    expect(single?.score.raw).toBeGreaterThanOrEqual(CASE_PASS_THRESHOLD);
    expect(single?.score.passed).toBe(true);
  });

  it("stops when the token budget is reached", async () => {
    const result = await runDataset(smallDataset, {
      providerDeps: { fetchImpl: hugeUsageTransport, sleep: async () => {} },
    });
    // The first turn's reconciled usage exceeds the process budget, so the run
    // breaks after the first case instead of spending the rest of the dataset.
    expect(result.cases).toHaveLength(1);
    expect(result.summary.cost_cap_reached).toBe(true);
    expect(result.verdict.abort).toBe(true);
    expect(result.verdict.triggers).toContain("HARD_COST_CAP_REACHED");
  });

  it("writes its result to a local JSON file when asked", async () => {
    const { mkdtemp, readFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const directory = await mkdtemp(join(tmpdir(), "ca9a-run-"));
    try {
      await runDataset(smallDataset, {
        providerDeps: mockDeps(),
        store: createJsonFileStore(directory),
      });
      const written = JSON.parse(await readFile(join(directory, "ca9b-run.json"), "utf8")) as {
        summary: { cases_scored: number };
      };
      expect(written.summary.cases_scored).toBe(2);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
