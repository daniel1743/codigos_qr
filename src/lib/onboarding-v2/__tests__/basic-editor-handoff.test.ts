import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { SIMPLE_CONTACT_FIXTURE, type OnboardingIntentV2 } from "../index";
import {
  buildBasicEditorHandoffUrl,
  completeOnboardingV2Handoff,
  type OnboardingV2HandoffPhase,
} from "../basic-editor-handoff";
import { generateFromOnboardingIntentV2 } from "../engine-v2-generation";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function fakeSupabase({
  profile = true,
  rpcError,
}: {
  profile?: boolean;
  rpcError?: Error;
} = {}): { client: SupabaseClient; getRpcCalls: () => number } {
  const generated = generateFromOnboardingIntentV2(SIMPLE_CONTACT_FIXTURE, {
    now: "2026-09-04T12:00:00.000Z",
  });
  if (generated.status !== "GENERATED") throw new Error("Fixture generation failed.");

  let templateConfig = {
    schemaVersion: 1,
    editorConfig: clone(generated.editorConfig),
  };
  let profileRow = {
    id: "qa-profile",
    user_id: "qa-user",
    display_name: "Antes",
    profession: "Antes",
    bio: "Bio anterior",
  };
  let links: Array<Record<string, unknown>> = [];
  let rpcCalls = 0;

  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "qa-user" } }, error: null }),
    },
    from: (table: string) => {
      const filters = new Map<string, unknown>();
      const chain = {
        select: () => chain,
        eq: (key: string, value: unknown) => {
          filters.set(key, value);
          return chain;
        },
        order: async () => {
          if (table === "profile_links") return { data: links, error: null };
          return { data: [], error: null };
        },
        update: (updates: Record<string, unknown>) => {
          profileRow = { ...profileRow, ...updates };
          return chain;
        },
        insert: (link: Record<string, unknown>) => {
          const created = {
            ...link,
            id: `link-${links.length + 1}`,
            sort_order: links.length,
          };
          links = [...links, created];
          return {
            select: () => ({
              single: async () => ({ data: created, error: null }),
            }),
          };
        },
        single: async () => ({ data: profileRow, error: null }),
        maybeSingle: async () => {
          if (filters.has("user_id")) {
            return { data: profile ? profileRow : null, error: null };
          }
          return { data: { template_config: templateConfig }, error: null };
        },
      };
      return chain;
    },
    rpc: async (_name: string, args: { p_editor_config: typeof generated.editorConfig }) => {
      rpcCalls += 1;
      if (rpcError) return { data: null, error: rpcError };
      templateConfig = { ...templateConfig, editorConfig: args.p_editor_config };
      return { data: { template_config: templateConfig }, error: null };
    },
  } as unknown as SupabaseClient;

  return { client, getRpcCalls: () => rpcCalls };
}

function testGenerator(intent: OnboardingIntentV2, now?: string) {
  return Promise.resolve(generateFromOnboardingIntentV2(intent, now ? { now } : {}));
}

describe("Onboarding V2 Basic Editor handoff", () => {
  it("resolves one existing profile, persists it and returns its exact id", async () => {
    const fake = fakeSupabase();
    const phases: OnboardingV2HandoffPhase[] = [];

    const result = await completeOnboardingV2Handoff({
      supabase: fake.client,
      intent: SIMPLE_CONTACT_FIXTURE,
      now: "2026-09-04T12:00:00.000Z",
      generate: testGenerator,
      onPhase: (phase) => phases.push(phase),
    });

    expect(result.status).toBe("SUCCESS");
    if (result.status !== "SUCCESS") return;
    expect(result.profileId).toBe("qa-profile");
    expect(result.persistence.profileId).toBe("qa-profile");
    expect(result.basic.profile.display_name).toBe(SIMPLE_CONTACT_FIXTURE.identity.displayName);
    expect(result.basic.profile.profession).toBe(
      SIMPLE_CONTACT_FIXTURE.identity.professionOrActivity,
    );
    expect(result.basic.profile.bio).toBe(SIMPLE_CONTACT_FIXTURE.identity.bio);
    expect(result.basic.links.map((link) => `${link.platform}:${link.url}`)).toEqual([
      "whatsapp:https://wa.me/56912345678",
      "instagram:https://www.instagram.com/jardineriaverde/",
    ]);
    expect(result.basic.skippedActionIndexes).toEqual([]);
    expect(phases).toEqual(["GENERATING", "PERSISTING"]);
    expect(fake.getRpcCalls()).toBe(1);
  });

  it("does not create or persist when the authenticated user has no profile", async () => {
    const fake = fakeSupabase({ profile: false });
    const result = await completeOnboardingV2Handoff({
      supabase: fake.client,
      intent: SIMPLE_CONTACT_FIXTURE,
      generate: testGenerator,
    });

    expect(result).toMatchObject({ status: "FAILED", code: "PROFILE_NOT_FOUND" });
    expect(fake.getRpcCalls()).toBe(0);
  });

  it("does not persist a failed generation result", async () => {
    const fake = fakeSupabase();
    const invalidIntent = {
      ...SIMPLE_CONTACT_FIXTURE,
      identity: { ...SIMPLE_CONTACT_FIXTURE.identity, displayName: "" },
    } as OnboardingIntentV2;

    const result = await completeOnboardingV2Handoff({
      supabase: fake.client,
      intent: invalidIntent,
      generate: testGenerator,
    });

    expect(result).toMatchObject({ status: "FAILED", code: "GENERATION_FAILED" });
    expect(fake.getRpcCalls()).toBe(0);
  });

  it("returns a persistence failure without redirecting to Basic Editor", async () => {
    const fake = fakeSupabase({ rpcError: new Error("RPC unavailable") });
    const result = await completeOnboardingV2Handoff({
      supabase: fake.client,
      intent: SIMPLE_CONTACT_FIXTURE,
      generate: testGenerator,
    });

    expect(result).toMatchObject({ status: "FAILED", code: "PERSISTENCE_FAILED" });
    expect(buildBasicEditorHandoffUrl("qa-profile")).toBe("/editor?profileId=qa-profile");
  });
});
