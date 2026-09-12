import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalPageService } from "@/services/canonical-page.service";
import { createDemoConfig } from "../../templates/definitions";
import {
  describePersistenceConfig,
  getPersistenceDebugSnapshot,
  isPersistenceDebugEnabled,
  recordPersistenceDebugEvent,
  resetPersistenceDebugForTests,
} from "../persistenceDebug";

afterEach(() => {
  vi.unstubAllGlobals();
  resetPersistenceDebugForTests();
});

describe("Power persistence diagnostics", () => {
  it("produces a deterministic fingerprint and detects a config change", () => {
    const config = createDemoConfig();
    const equivalentConfig = JSON.parse(JSON.stringify(config));
    const changedConfig = { ...config, pageInstanceId: `${config.pageInstanceId}-changed` };

    expect(describePersistenceConfig(config).fingerprint).toBe(
      describePersistenceConfig(equivalentConfig).fingerprint,
    );
    expect(describePersistenceConfig(changedConfig).fingerprint).not.toBe(
      describePersistenceConfig(config).fingerprint,
    );
  });

  it("does not record diagnostics without the explicit query flag", () => {
    vi.stubGlobal("window", { location: { search: "" } });

    expect(isPersistenceDebugEnabled()).toBe(false);
    recordPersistenceDebugEvent({ stage: "PROFILE_CONTEXT", profileId: "profile-id" });

    expect(getPersistenceDebugSnapshot().profileId).toBeNull();
  });

  it("uses read-only queries for draft and published readback", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const rpc = vi.fn();
    const supabase = { from, rpc } as unknown as SupabaseClient;

    await canonicalPageService.get(supabase, "profile-id");
    await canonicalPageService.getPublished(supabase, "profile-id");

    expect(rpc).not.toHaveBeenCalled();
    expect(select).toHaveBeenNthCalledWith(1, "template_config");
    expect(select).toHaveBeenNthCalledWith(2, "published_template_config");
  });
});
