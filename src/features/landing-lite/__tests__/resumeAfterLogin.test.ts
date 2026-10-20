// @vitest-environment happy-dom
/**
 * Landing Launch Lite V2 - B2 closure tests for Option A.
 *
 * `resolvePostLoginTarget` is the only decision the post-login page makes, so it
 * is tested on its own (no router, no network): success, no session, no intent,
 * boundary failure and session failure. The last test uses the REAL intent reader
 * against happy-dom's `sessionStorage` to prove the intent is consumed exactly once
 * - which is what makes the effect incapable of looping.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CREATION_INTENT_KEY, markCreationIntent } from "../creationIntent";
import type { CreationResumeTarget, ResumeCreationDeps } from "../resumeCreation";
import { resolvePostLoginTarget } from "../resumeAfterLogin";

const TARGET: CreationResumeTarget = {
  to: "/pages/$pageId/edit",
  params: { pageId: "page-123" },
  search: { directEditor: undefined, magicProduction: undefined, legacyEditor: undefined },
};

const session = { user: { id: "user-1", email: "a@b.c", user_metadata: { full_name: "Ana" } } };

/** Supabase double: only `auth.getSession` is used by the resolver. */
function supabaseWith(getSession: () => Promise<unknown>) {
  return { auth: { getSession } } as never;
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  window.sessionStorage.clear();
  document.body.replaceChildren();
});

describe("post-login destination (Option A)", () => {
  it("resumes into the owner's card when a session and an intent exist", async () => {
    const resume = vi.fn(async (_deps: ResumeCreationDeps) => TARGET);
    const result = await resolvePostLoginTarget({
      getSupabase: () => supabaseWith(async () => ({ data: { session } })),
      resume,
    });

    expect(result).toEqual(TARGET);
    // Internal destination only: the page id comes from the server, never from input.
    expect(result?.to).toBe("/pages/$pageId/edit");
    expect(resume).toHaveBeenCalledTimes(1);
    expect(resume.mock.calls[0]?.[0]).toMatchObject({
      userId: "user-1",
      email: "a@b.c",
      userMetadata: { full_name: "Ana" },
    });
  });

  it("keeps the normal profile when there is no session", async () => {
    const resume = vi.fn(async (_deps: ResumeCreationDeps) => TARGET);
    const result = await resolvePostLoginTarget({
      getSupabase: () => supabaseWith(async () => ({ data: { session: null } })),
      resume,
    });

    expect(result).toBeNull();
    // Anonymous visitors never reach the creation boundary.
    expect(resume).not.toHaveBeenCalled();
  });

  it("keeps the normal profile when there is no pending intent", async () => {
    const resume = vi.fn(async (_deps: ResumeCreationDeps) => null);
    const result = await resolvePostLoginTarget({
      getSupabase: () => supabaseWith(async () => ({ data: { session } })),
      resume,
    });

    expect(result).toBeNull();
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("never throws when reading the session fails", async () => {
    const resume = vi.fn(async (_deps: ResumeCreationDeps) => TARGET);
    const result = await resolvePostLoginTarget({
      getSupabase: () =>
        supabaseWith(async () => {
          throw new Error("offline");
        }),
      resume,
    });

    expect(result).toBeNull();
    expect(resume).not.toHaveBeenCalled();
  });

  it("never throws when the creation boundary fails", async () => {
    const result = await resolvePostLoginTarget({
      getSupabase: () => supabaseWith(async () => ({ data: { session } })),
      resume: async () => {
        throw new Error("boundary exploded");
      },
    });

    expect(result).toBeNull();
  });

  it("consumes the pending intent exactly once and cannot loop", async () => {
    markCreationIntent(window.sessionStorage);
    expect(window.sessionStorage.getItem(CREATION_INTENT_KEY)).not.toBeNull();

    // Real reader + real boundary; the Supabase double exposes no `.from`, so the
    // boundary throws and the fail-safe path is exercised end to end.
    const first = await resolvePostLoginTarget({
      getSupabase: () => supabaseWith(async () => ({ data: { session } })),
    });
    expect(first).toBeNull();
    // The intent was consumed before the boundary ran: a retry has nothing to resume.
    expect(window.sessionStorage.getItem(CREATION_INTENT_KEY)).toBeNull();

    const second = await resolvePostLoginTarget({
      getSupabase: () => supabaseWith(async () => ({ data: { session } })),
    });
    expect(second).toBeNull();
  });
});

describe("profile route wiring (contract)", () => {
  const route = readFileSync(resolve(process.cwd(), "src/routes/profile.tsx"), "utf8");

  it("connects the resolver and navigates only when a target exists", () => {
    expect(route).toContain('from "../features/landing-lite/resumeAfterLogin"');
    expect(route).toContain("resolvePostLoginTarget()");
    expect(route).toContain("if (active && target)");
  });

  it("keeps the profile page and does not touch authentication", () => {
    expect(route).toContain("<MyProfilePage />");
    expect(route).toContain("<AppShell>");
    // The shared auth component is not imported, referenced nor modified here.
    expect(route).not.toContain("components/Auth");
    expect(route).not.toContain("window.location");
  });
});
