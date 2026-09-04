import { describe, expect, it } from "vitest";
import { planControlledAdjustments, validateSupervisorEvaluation } from "../ai/guardrails";
import { superviseWithDeepSeek } from "../ai/deepseek-provider";
import type { SupervisorInput } from "../ai/types";

const input: SupervisorInput = {
  userIntent: {
    profession: "manicurist",
    goal: "booking",
    style: "luxury",
    selectedFeatures: ["gallery", "booking"],
    availableUserMedia: ["logo"],
  },
  selectedMedia: [
    { role: "banner", provider: "unsplash", query: "luxury nail salon", alt: "luxury nail salon" },
  ],
  engineSummary: {
    family: "luxury",
    layout: "centered",
    mediaStrategy: "banner-first",
    blockSequence: ["hero", "buttonGroup"],
    ctaStrategy: "strong",
    backgroundStrategy: "gradient",
    buttonCardStrategy: "solid/elevated",
    contentDensity: "balanced",
  },
};

const validEvaluation = {
  verdict: "PASS_WITH_WARNINGS",
  coherence_score: 88,
  warnings: ["Gallery is intentionally compact."],
  suggestions: [
    {
      adjustment: "reduce-media-density",
      role: "gallery",
      reason: "Keep the booking path focused.",
    },
  ],
};

function deepSeekResponse(body: unknown, ok = true): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status: ok ? 200 : 500 })) as typeof fetch;
}

describe("DeepSeek Supervisor guardrail", () => {
  it("accepts only the structured evaluation contract", () => {
    const evaluation = validateSupervisorEvaluation(validEvaluation);
    expect(evaluation.verdict).toBe("PASS_WITH_WARNINGS");
    expect(planControlledAdjustments(evaluation)[0]?.adjustment).toBe("reduce-media-density");
  });

  it("rejects raw CSS, invented block types and unsupported fields safely", () => {
    expect(() =>
      validateSupervisorEvaluation({
        ...validEvaluation,
        suggestions: [{ adjustment: "new-block-type", reason: "add a block" }],
      }),
    ).toThrow();
    expect(() =>
      validateSupervisorEvaluation({ ...validEvaluation, warnings: ["css: color: red"] }),
    ).toThrow();
    expect(() =>
      validateSupervisorEvaluation({
        ...validEvaluation,
        suggestions: [{ adjustment: "reduce-media-density", reason: "<style>" }],
      }),
    ).toThrow();
    expect(() =>
      validateSupervisorEvaluation({ ...validEvaluation, config: { blocks: [] } }),
    ).toThrow();
  });

  it("performs one bounded structured request", async () => {
    let calls = 0;
    const outcome = await superviseWithDeepSeek(input, {
      apiKey: "test-key",
      fetchImpl: (async (...args) => {
        calls += 1;
        return deepSeekResponse({
          choices: [{ message: { content: JSON.stringify(validEvaluation) } }],
        })(...args);
      }) as typeof fetch,
    });
    expect(calls).toBe(1);
    expect(outcome).toMatchObject({
      status: "available",
      evaluation: { verdict: "PASS_WITH_WARNINGS", coherence_score: 88 },
    });
  });

  it("fails open when the key or provider is unavailable", async () => {
    await expect(
      superviseWithDeepSeek(input, { apiKey: "", fetchImpl: deepSeekResponse({}) }),
    ).resolves.toMatchObject({ status: "unavailable", errorCode: "MISSING_API_KEY" });
    await expect(
      superviseWithDeepSeek(input, { apiKey: "test-key", fetchImpl: deepSeekResponse({}, false) }),
    ).resolves.toMatchObject({ status: "unavailable", errorCode: "REQUEST_FAILED" });
    await expect(
      superviseWithDeepSeek(input, {
        apiKey: "test-key",
        fetchImpl: deepSeekResponse({ choices: [{ message: { content: "not json" } }] }),
      }),
    ).resolves.toMatchObject({ status: "unavailable", errorCode: "INVALID_RESPONSE" });
  });
});
