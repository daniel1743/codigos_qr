import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SIMPLE_CONTACT_FIXTURE, type OnboardingIntentV2 } from "../index";
import { generateFromOnboardingIntentV2 } from "../engine-v2-generation";
import {
  persistOnboardingGeneratedPageV2,
  type OnboardingV2PersistenceResult,
} from "../canonical-persistence";
import type { OnboardingV2GenerationSuccess } from "../engine-v2-generation";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type FakeOptions = {
  userId?: string | null;
  ownsProfile?: boolean;
  rpcError?: Error;
  dropNamespaces?: boolean;
};

function generatedResult(intent: OnboardingIntentV2): OnboardingV2GenerationSuccess {
  const result = generateFromOnboardingIntentV2(intent, {
    now: "2026-09-04T12:00:00.000Z",
  });
  if (result.status !== "GENERATED") {
    throw new Error(`Expected generated fixture, received ${result.status}.`);
  }
  return result;
}

function fakeSupabase(
  initialTemplateConfig: Record<string, unknown>,
  options: FakeOptions = {},
): {
  client: SupabaseClient;
  getTemplateConfig: () => Record<string, unknown>;
  getRpcCalls: () => number;
} {
  let templateConfig = clone(initialTemplateConfig);
  let rpcCalls = 0;

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: options.userId ? { id: options.userId } : null },
        error: null,
      }),
    },
    from: () => {
      const filters = new Map<string, unknown>();
      const chain = {
        select: () => chain,
        eq: (key: string, value: unknown) => {
          filters.set(key, value);
          return chain;
        },
        maybeSingle: async () => {
          if (filters.has("user_id")) {
            return {
              data:
                options.ownsProfile === false
                  ? null
                  : { id: filters.get("id"), user_id: filters.get("user_id") },
              error: null,
            };
          }
          return { data: { template_config: templateConfig }, error: null };
        },
      };
      return chain;
    },
    rpc: async (_name: string, args: { p_editor_config: Record<string, unknown> }) => {
      rpcCalls += 1;
      if (options.rpcError) return { data: null, error: options.rpcError };
      const preserved = options.dropNamespaces
        ? { schemaVersion: 1, editorConfig: args.p_editor_config }
        : {
            ...templateConfig,
            schemaVersion: 1,
            editorConfig: args.p_editor_config,
          };
      templateConfig = preserved;
      return { data: { template_config: templateConfig }, error: null };
    },
  } as unknown as SupabaseClient;

  return {
    client,
    getTemplateConfig: () => clone(templateConfig),
    getRpcCalls: () => rpcCalls,
  };
}

function initialTemplateConfig(editorConfig: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: 1,
    editorConfig,
    basic_link_presentations: { instagram: { style: "icon" } },
    professional_badge: true,
    qa_namespace: { preserved: true },
  };
}

describe("Onboarding V2 canonical persistence", () => {
  it("authenticates, reuses the canonical RPC, verifies the snapshot and preserves namespaces", async () => {
    const generated = generatedResult(SIMPLE_CONTACT_FIXTURE);
    const fake = fakeSupabase(initialTemplateConfig(generated.editorConfig), {
      userId: "qa-user",
    });

    const result = await persistOnboardingGeneratedPageV2({
      supabase: fake.client,
      profileId: "qa-profile",
      intent: SIMPLE_CONTACT_FIXTURE,
      generatedResult: generated,
    });

    expect(result.status).toBe("PERSISTED");
    if (result.status !== "PERSISTED") return;
    expect(result.authUserId).toBe("qa-user");
    expect(result.persisted.schemaVersion).toBe(1);
    expect(result.verified.editorConfig).toEqual(generated.editorConfig);
    expect(result.preservedTopLevelKeys).toEqual(
      expect.arrayContaining(["basic_link_presentations", "professional_badge", "qa_namespace"]),
    );
    expect(fake.getTemplateConfig()).toMatchObject({
      basic_link_presentations: { instagram: { style: "icon" } },
      professional_badge: true,
      qa_namespace: { preserved: true },
    });
    expect(fake.getRpcCalls()).toBe(1);
  });

  it("blocks missing authentication before any ownership check or write", async () => {
    const generated = generatedResult(SIMPLE_CONTACT_FIXTURE);
    const fake = fakeSupabase(initialTemplateConfig(generated.editorConfig), { userId: null });

    const result = await persistOnboardingGeneratedPageV2({
      supabase: fake.client,
      profileId: "qa-profile",
      intent: SIMPLE_CONTACT_FIXTURE,
      generatedResult: generated,
    });

    expect(result).toMatchObject({ status: "NOT_PERSISTED", code: "AUTH_REQUIRED" });
    expect(fake.getRpcCalls()).toBe(0);
  });

  it("blocks a non-owned profile through the normal ownership query", async () => {
    const generated = generatedResult(SIMPLE_CONTACT_FIXTURE);
    const fake = fakeSupabase(initialTemplateConfig(generated.editorConfig), {
      userId: "qa-user",
      ownsProfile: false,
    });

    const result = await persistOnboardingGeneratedPageV2({
      supabase: fake.client,
      profileId: "other-profile",
      intent: SIMPLE_CONTACT_FIXTURE,
      generatedResult: generated,
    });

    expect(result).toMatchObject({ status: "NOT_PERSISTED", code: "FORBIDDEN" });
    expect(fake.getRpcCalls()).toBe(0);
  });

  it("does not write when generation failed or editorConfig is invalid", async () => {
    const generated = generatedResult(SIMPLE_CONTACT_FIXTURE);
    const fake = fakeSupabase(initialTemplateConfig(generated.editorConfig), {
      userId: "qa-user",
    });
    const failedGeneration = {
      status: "NEEDS_INPUT" as const,
      onboardingIntent: SIMPLE_CONTACT_FIXTURE,
      diagnostics: generated.diagnostics,
      errors: ["missing primary action"],
    };

    const generationResult = await persistOnboardingGeneratedPageV2({
      supabase: fake.client,
      profileId: "qa-profile",
      intent: SIMPLE_CONTACT_FIXTURE,
      generatedResult: failedGeneration,
    });
    expect(generationResult).toMatchObject({ status: "NOT_PERSISTED", code: "GENERATION_FAILED" });
    expect(fake.getRpcCalls()).toBe(0);

    const invalidConfigResult = await persistOnboardingGeneratedPageV2({
      supabase: fake.client,
      profileId: "qa-profile",
      intent: SIMPLE_CONTACT_FIXTURE,
      generatedResult: { ...generated, editorConfig: {} as typeof generated.editorConfig },
    });
    expect(invalidConfigResult).toMatchObject({
      status: "NOT_PERSISTED",
      code: "INVALID_ENGINE_OUTPUT",
    });
    expect(fake.getRpcCalls()).toBe(0);
  });

  it("returns the RPC failure without falling back to a direct update", async () => {
    const generated = generatedResult(SIMPLE_CONTACT_FIXTURE);
    const fake = fakeSupabase(initialTemplateConfig(generated.editorConfig), {
      userId: "qa-user",
      rpcError: new Error("Profile not found or not owned by the current user."),
    });

    const result: OnboardingV2PersistenceResult = await persistOnboardingGeneratedPageV2({
      supabase: fake.client,
      profileId: "qa-profile",
      intent: SIMPLE_CONTACT_FIXTURE,
      generatedResult: generated,
    });

    expect(result).toMatchObject({
      status: "NOT_PERSISTED",
      code: "PERSISTENCE_FAILED",
      error: "Profile not found or not owned by the current user.",
    });
    expect(fake.getRpcCalls()).toBe(1);
  });

  it("detects namespace loss instead of reporting persistence success", async () => {
    const generated = generatedResult(SIMPLE_CONTACT_FIXTURE);
    const fake = fakeSupabase(initialTemplateConfig(generated.editorConfig), {
      userId: "qa-user",
      dropNamespaces: true,
    });

    const result = await persistOnboardingGeneratedPageV2({
      supabase: fake.client,
      profileId: "qa-profile",
      intent: SIMPLE_CONTACT_FIXTURE,
      generatedResult: generated,
    });

    expect(result).toMatchObject({ status: "NOT_PERSISTED", code: "VERIFICATION_FAILED" });
    expect(fake.getRpcCalls()).toBe(1);
  });
});
