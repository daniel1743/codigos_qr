// @vitest-environment happy-dom
/**
 * Guest Editor V1 - G6.1/G6.3/G6.4 tests: the post-login claim.
 *
 * Proves the rules the visitor depends on:
 *   - a draft is never cleared by login, by the modal or by receiving a session;
 *   - a draft takes precedence over the legacy creation intent (which is consumed);
 *   - the editor destination exists only after a VERIFIED transfer;
 *   - conflict/failure keep the draft and return a recoverable message.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInitialMagicPageDocument,
  type MagicPageDocumentV1,
} from "../../magic-page-editor-production/magic-document";
import { claimGuestDraft } from "../claimGuestDraft";
import { resolveGuestDraftClaim, GUEST_CLAIM_MESSAGES } from "../claimAfterLogin";
import { clearGuestDraft, readGuestDraft, saveGuestDraft } from "../guestDraft";
import { createGuestMediaStore, type MediaAdapter, type StoredMedia } from "../guestMediaStore";

function fakeSupabase(session: { id: string; email?: string } | null) {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: session
            ? { user: { id: session.id, email: session.email ?? null, user_metadata: {} } }
            : null,
        },
        error: null,
      })),
    },
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ error: null })),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn/${path}` } }),
      }),
    },
  } as never;
}

function memoryAdapter(): MediaAdapter {
  const entries = new Map<string, StoredMedia>();
  return {
    async put(entry) {
      entries.set(entry.id, entry);
    },
    async get(id) {
      return entries.get(id) ?? null;
    },
    async list(ids) {
      return ids.map((id) => entries.get(id)).filter((e): e is StoredMedia => !!e);
    },
    async delete(ids) {
      ids.forEach((id) => entries.delete(id));
    },
    async clear() {
      entries.clear();
    },
    async pruneBefore() {
      return 0;
    },
  };
}

/** Writes a real draft in localStorage, exactly like the guest editor does. */
function persistDraft(document: MagicPageDocumentV1) {
  const result = saveGuestDraft(document, undefined, Date.now());
  expect(result.ok).toBe(true);
}

function draftDocument(): MagicPageDocumentV1 {
  const document = createInitialMagicPageDocument("bio");
  return { ...document, texts: { ...document.texts, "hero.name": "Invitada" } };
}

beforeEach(() => {
  clearGuestDraft();
});

describe("post-login claim (G6.1/G6.4)", () => {
  it("does nothing at all when there is no draft", async () => {
    const claim = vi.fn();
    const consumeIntent = vi.fn();
    const outcome = await resolveGuestDraftClaim({
      getSupabase: () => fakeSupabase({ id: "user-1" }),
      claim: claim as never,
      hasPendingIntent: () => true,
      consumeIntent,
    });

    expect(outcome).toEqual({ target: null, notice: null, result: null });
    expect(claim).not.toHaveBeenCalled();
    // Without a draft the legacy intent must keep working: nothing is consumed.
    expect(consumeIntent).not.toHaveBeenCalled();
  });

  it("keeps the draft untouched when there is no session yet", async () => {
    persistDraft(draftDocument());
    const claim = vi.fn();
    const outcome = await resolveGuestDraftClaim({
      getSupabase: () => fakeSupabase(null),
      claim: claim as never,
      hasPendingIntent: () => false,
    });

    expect(outcome.target).toBeNull();
    expect(claim).not.toHaveBeenCalled();
    expect(readGuestDraft()).not.toBeNull();
  });

  it("claims the draft, consumes the legacy intent and returns the editor target", async () => {
    persistDraft(draftDocument());
    const consumeIntent = vi.fn();
    const outcome = await resolveGuestDraftClaim({
      getSupabase: () => fakeSupabase({ id: "user-9", email: "u@c.dev" }),
      mediaStore: createGuestMediaStore(memoryAdapter()),
      hasPendingIntent: () => true,
      consumeIntent,
      claim: (async () => ({
        status: "claimed",
        pageId: "page-9",
        verified: true,
        mediaUploaded: 0,
        mediaPendingLocal: [],
      })) as never,
    });

    // The draft wins over the old intent: no second competing flow.
    expect(consumeIntent).toHaveBeenCalledTimes(1);
    expect(outcome.target).toEqual({
      to: "/pages/$pageId/edit",
      params: { pageId: "page-9" },
      search: expect.anything(),
    });
    expect(outcome.notice).toEqual({ kind: "complete", message: GUEST_CLAIM_MESSAGES.complete });
  });

  it("keeps a real draft and reports a conflict when the account already has content", async () => {
    const document = draftDocument();
    persistDraft(document);
    const outcome = await resolveGuestDraftClaim({
      getSupabase: () => fakeSupabase({ id: "user-9" }),
      mediaStore: createGuestMediaStore(memoryAdapter()),
      // The REAL claim, with the services replaced by doubles.
      claim: claimGuestDraft,
      claimDeps: {
        ensureProfile: vi.fn(async () => undefined) as never,
        createOrResumePage: vi.fn(async () => ({ page: { id: "page-9" }, resumed: true })) as never,
        readDocument: vi.fn(async () => ({
          ...document,
          texts: { ...document.texts, "hero.name": "Otra persona" },
        })),
        saveDocument: vi.fn() as never,
      },
    });

    expect(outcome.target).toBeNull();
    expect(outcome.notice?.kind).toBe("conflict");
    expect(outcome.notice?.message).toBe(GUEST_CLAIM_MESSAGES.conflict);
    // The visitor's work is still in this browser.
    expect(readGuestDraft()?.document).toEqual(document);
  });

  it("reports a recoverable error without losing the draft when the claim throws", async () => {
    persistDraft(draftDocument());
    const outcome = await resolveGuestDraftClaim({
      getSupabase: () => fakeSupabase({ id: "user-9" }),
      mediaStore: createGuestMediaStore(memoryAdapter()),
      claim: (async () => {
        throw new Error("sin red");
      }) as never,
      hasPendingIntent: () => false,
    });

    expect(outcome.target).toBeNull();
    expect(outcome.notice?.kind).toBe("recoverable");
    expect(readGuestDraft()).not.toBeNull();
  });

  it("reports the photos that still need to be picked again", async () => {
    persistDraft(draftDocument());
    const outcome = await resolveGuestDraftClaim({
      getSupabase: () => fakeSupabase({ id: "user-9" }),
      mediaStore: createGuestMediaStore(memoryAdapter()),
      claim: (async () => ({
        status: "claimed",
        pageId: "page-9",
        verified: true,
        mediaUploaded: 1,
        mediaPendingLocal: ["cover.src"],
      })) as never,
      hasPendingIntent: () => false,
    });

    expect(outcome.notice?.message).toBe(GUEST_CLAIM_MESSAGES.mediaPending);
    expect(outcome.notice?.mediaPendingLocal).toEqual(["cover.src"]);
  });
});
