import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveQaProfile } from "../qa-profile-resolution-server";

const USER_ID = "qa-user";
const PROFILE_ONE = "11111111-1111-4111-8111-111111111111";
const PROFILE_TWO = "22222222-2222-4222-8222-222222222222";

function fakeSupabase(
  profiles: Array<{ id: string; user_id: string; display_name?: string; public_id?: string }>,
  user: { id: string } | null = { id: USER_ID },
) {
  return {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`Unexpected table: ${table}`);
      const query = {
        select: () => query,
        eq: (_key: string, _value: string) => query,
        maybeSingle: async () => ({
          data: profiles.find((profile) => profile.user_id === USER_ID) ?? null,
          error: null,
        }),
        order: async () => ({
          data: profiles.filter((profile) => profile.user_id === USER_ID),
          error: null,
        }),
      };
      return query;
    },
  } as unknown as Pick<SupabaseClient, "auth" | "from">;
}

describe("QA onboarding profile resolution", () => {
  it("resolves the only profile owned by the authenticated user", async () => {
    const result = await resolveQaProfile(
      fakeSupabase([{ id: PROFILE_ONE, user_id: USER_ID, display_name: "Estudio QA" }]),
    );

    expect(result).toEqual({
      status: "RESOLVED",
      profileId: PROFILE_ONE,
      profiles: [{ id: PROFILE_ONE, displayName: "Estudio QA", publicId: null }],
    });
  });

  it("returns an owned-profile selector when the user has multiple profiles", async () => {
    const result = await resolveQaProfile(
      fakeSupabase([
        { id: PROFILE_ONE, user_id: USER_ID, display_name: "Estudio QA" },
        { id: PROFILE_TWO, user_id: USER_ID, display_name: "Tienda QA", public_id: "tienda-qa" },
      ]),
    );

    expect(result).toMatchObject({
      status: "SELECT_PROFILE",
      profiles: [
        { id: PROFILE_ONE, displayName: "Estudio QA" },
        { id: PROFILE_TWO, displayName: "Tienda QA", publicId: "tienda-qa" },
      ],
    });
  });

  it("accepts a requested profile only when it belongs to the authenticated user", async () => {
    const result = await resolveQaProfile(
      fakeSupabase([{ id: PROFILE_ONE, user_id: USER_ID }]),
      PROFILE_ONE,
    );

    expect(result).toMatchObject({ status: "RESOLVED", profileId: PROFILE_ONE });
  });

  it("does not reveal or resolve a foreign profile id", async () => {
    const result = await resolveQaProfile(
      fakeSupabase([{ id: PROFILE_ONE, user_id: "another-user" }]),
      PROFILE_ONE,
    );

    expect(result).toEqual({
      status: "PROFILE_NOT_AVAILABLE",
      profiles: [],
      message: "No encontramos un perfil disponible para esta sesión.",
    });
  });

  it("reports unauthenticated and profile-less sessions truthfully", async () => {
    const unauthenticated = await resolveQaProfile(fakeSupabase([], null));
    const noProfile = await resolveQaProfile(fakeSupabase([]));

    expect(unauthenticated).toMatchObject({ status: "AUTH_REQUIRED" });
    expect(noProfile).toMatchObject({ status: "NO_PROFILES" });
  });
});
