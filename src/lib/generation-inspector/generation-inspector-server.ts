import { createServerFn } from "@tanstack/react-start";

import type { OwnerContentInput } from "@/lib/page-generator/owner-content";
import { validateOnboardingIntentV2 } from "@/lib/onboarding-v2/validation";
import type { OnboardingIntentV2 } from "@/lib/onboarding-v2/types";
import type { OnboardingSmartPagesGenerationResult } from "@/lib/onboarding-v2/smart-pages-adapter";
import {
  generateCripqerPageWithEngineV2Traced,
  toEngineIntentForDiagnostics,
} from "@/lib/parametric-engine-v2/internal-entrypoint";
import { validateIntent } from "@/lib/parametric-engine-v2/normalize";
import { getServerIntegrationSecret } from "@/server/integrations/server-fetch";
import { buildGenerationTrace, createTraceId } from "./index";
import type { GenerationTraceV1 } from "./types";

interface InspectorInput {
  intent: OnboardingIntentV2;
  ownerContent?: OwnerContentInput;
  now: string;
  traceId?: string;
}

export interface InspectorResult {
  generation: OnboardingSmartPagesGenerationResult;
  trace: GenerationTraceV1;
}

function validateInput(value: unknown): InspectorInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Los datos del onboarding no son válidos.");
  }
  const input = value as Partial<InspectorInput>;
  const validation = validateOnboardingIntentV2(input.intent);
  if (!validation.valid) {
    throw new Error(validation.issues.map((i) => `${i.path ?? "intent"}: ${i.message}`).join(" "));
  }
  if (typeof input.now !== "string" || !input.now.trim()) {
    throw new Error("Falta la fecha de generación.");
  }
  return {
    intent: input.intent as OnboardingIntentV2,
    ...(input.ownerContent ? { ownerContent: input.ownerContent } : {}),
    now: input.now,
    ...(input.traceId ? { traceId: input.traceId } : {}),
  };
}

/**
 * QA-ONLY RPC: runs the real generation chain and returns a full
 * GenerationTraceV1 alongside the generation result. It never persists and is
 * only reachable from the /onboarding-test inspector.
 */
export const generateSmartPageWithTraceFn = createServerFn({ method: "POST", strict: false })
  .validator(validateInput)
  .handler(async ({ data }): Promise<InspectorResult> => {
    const { generateSmartPageFromOnboarding } = await import(
      "@/lib/onboarding-v2/smart-pages-adapter"
    );
    const now = data.now;
    const traceId = data.traceId ?? createTraceId();

    const generation = generateSmartPageFromOnboarding(data.intent, {
      ...(data.ownerContent ? { ownerContent: data.ownerContent } : {}),
      now,
    });

    let strategy: ReturnType<typeof generateCripqerPageWithEngineV2Traced>["trace"] | null = null;
    let strategyFailure: { payload: unknown; issues: unknown } | undefined;
    const diagnosticMapping = generation.ok
      ? generation.mapping
      : generation.mapping?.ok
        ? generation.mapping
        : null;
    if (diagnosticMapping) {
      try {
        const adapter = diagnosticMapping.adapter;
        const traced = generateCripqerPageWithEngineV2Traced(adapter.engineInput, {
          now,
          ...(adapter.contentBlocks ? { contentBlocks: adapter.contentBlocks } : {}),
          ...(adapter.engineOptions ? { engine: adapter.engineOptions } : {}),
        });
        strategy = traced.trace;
      } catch {
        strategy = null;
        try {
          const payload = toEngineIntentForDiagnostics(adapter.engineInput, {
            now,
            ...(adapter.contentBlocks ? { contentBlocks: adapter.contentBlocks } : {}),
          });
          strategyFailure = { payload, issues: validateIntent(payload) };
        } catch {
          strategyFailure = { payload: adapter.engineInput, issues: ["Unable to reconstruct diagnostic payload."] };
        }
      }
    }

    const unsplashConnected = Boolean(getServerIntegrationSecret("UNSPLASH_ACCESS_KEY")?.trim());
    const pexelsConnected = Boolean(getServerIntegrationSecret("PEXELS_API_KEY")?.trim());

    const trace = buildGenerationTrace({
      traceId,
      scenarioId: data.intent.identity.professionOrActivity || "unknown",
      intent: data.intent,
      ownerContent: data.ownerContent ?? {},
      now,
      live: generation,
      strategy,
      unsplashConnected,
      pexelsConnected,
    });

    if (strategyFailure) {
      trace.failure = {
        ...(trace.failure ?? {}),
        stage: "T7",
        stageName: "ENGINE STRATEGY",
        code: "ENGINE_GENERATION_ERROR",
        message: "OnboardingIntentV1 is invalid.",
        validator: "validateIntent",
        payload: strategyFailure.payload,
        issues: strategyFailure.issues,
      };
    }
    return { generation, trace };
  });
