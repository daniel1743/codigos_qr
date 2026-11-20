// @vitest-environment happy-dom
/**
 * Guest Editor V1 - G4 tests: the local draft lifecycle.
 *
 * Everything here runs against a memory storage double, so the assertions are about
 * the CONTRACT (shape, TTL, local-media stripping, quota safety), not about the
 * browser. The document fixture is built with the real Magic contract.
 */
import { describe, expect, it, vi } from "vitest";
import {
  createInitialMagicPageDocument,
  type MagicPageDocumentV1,
} from "../../magic-page-editor-production/magic-document";
import {
  GUEST_DRAFT_KEY,
  GUEST_DRAFT_MAX_BYTES,
  GUEST_DRAFT_TTL_MS,
  clearGuestDraft,
  isLocalMediaSource,
  readGuestDraft,
  saveGuestDraft,
  stripLocalMedia,
} from "../guestDraft";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

function bioDocument(props: Record<string, Record<string, string>> = {}): MagicPageDocumentV1 {
  const document = createInitialMagicPageDocument("bio");
  return { ...document, props: { ...document.props, ...props } };
}

describe("guest draft (G4)", () => {
  it("is absent by default and round-trips a saved document", () => {
    const storage = memoryStorage();
    expect(readGuestDraft(storage)).toBeNull();

    const saved = saveGuestDraft(
      bioDocument({ avatar: { src: "https://cdn.example.com/a.jpg" } }),
      storage,
      1000,
    );
    expect(saved.ok).toBe(true);

    const draft = readGuestDraft(storage, 1500);
    expect(draft?.document.template.id).toBe("bio");
    expect(draft?.document.props["avatar"]?.["src"]).toBe("https://cdn.example.com/a.jpg");
    expect(draft?.createdAt).toBe(1000);
    expect(draft?.updatedAt).toBe(1000);
  });

  it("keeps the original creation time across autosaves", () => {
    const storage = memoryStorage();
    saveGuestDraft(bioDocument(), storage, 1000);
    saveGuestDraft(bioDocument({ avatar: { src: "https://x/y.jpg" } }), storage, 5000);
    const draft = readGuestDraft(storage, 5001);
    expect(draft?.createdAt).toBe(1000);
    expect(draft?.updatedAt).toBe(5000);
  });

  it("never stores local media and reports what was dropped", () => {
    const storage = memoryStorage();
    const result = saveGuestDraft(
      bioDocument({
        avatar: { src: "blob:http://localhost/abc", cropX: "40" },
        "block:hero": { src: "data:image/png;base64,AAAA" },
      }),
      storage,
      1000,
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.mediaRefs.map((ref) => ref.prop).sort()).toEqual([
      "avatar.src",
      "block:hero.src",
    ]);
    const raw = storage.getItem(GUEST_DRAFT_KEY) ?? "";
    expect(raw).not.toContain("blob:");
    expect(raw).not.toContain("data:image");
    // The non-media props of the same element survive.
    expect(readGuestDraft(storage, 1001)?.document.props["avatar"]?.["cropX"]).toBe("40");
  });

  it("classifies local sources and does not mutate the given document", () => {
    expect(isLocalMediaSource("blob:x")).toBe(true);
    expect(isLocalMediaSource("data:image/png;base64,AA")).toBe(true);
    expect(isLocalMediaSource("https://cdn/x.jpg")).toBe(false);

    const document = bioDocument({ avatar: { src: "blob:x" } });
    const stripped = stripLocalMedia(document);
    expect(stripped.mediaRefs.map((ref) => ref.prop)).toEqual(["avatar.src"]);
    // Without a resolver the reference carries no id: the file cannot be recovered.
    expect(stripped.mediaRefs[0]?.id).toBeNull();
    expect(document.props["avatar"]?.["src"]).toBe("blob:x");
  });

  it("discards malformed, foreign-versioned and expired payloads", () => {
    const storage = memoryStorage();
    storage.setItem(GUEST_DRAFT_KEY, "not json");
    expect(readGuestDraft(storage)).toBeNull();
    expect(storage.getItem(GUEST_DRAFT_KEY)).toBeNull();

    storage.setItem(
      GUEST_DRAFT_KEY,
      JSON.stringify({ v: 99, createdAt: 1, updatedAt: 1, document: {} }),
    );
    expect(readGuestDraft(storage)).toBeNull();

    storage.setItem(
      GUEST_DRAFT_KEY,
      JSON.stringify({ v: 1, createdAt: 0, updatedAt: 0, document: { nope: true } }),
    );
    expect(readGuestDraft(storage)).toBeNull();

    storage.setItem(
      GUEST_DRAFT_KEY,
      JSON.stringify({ v: 1, createdAt: 0, updatedAt: 1000, document: bioDocument() }),
    );
    expect(readGuestDraft(storage, 1000 + GUEST_DRAFT_TTL_MS + 1)).toBeNull();
  });

  it("survives a quota failure without destroying anything in memory", () => {
    const storage = memoryStorage();
    const first = saveGuestDraft(
      bioDocument({ avatar: { src: "https://cdn/keep.jpg" } }),
      storage,
      1000,
    );
    expect(first.ok).toBe(true);

    const broken = {
      getItem: (k: string) => storage.getItem(k),
      setItem: vi.fn(() => {
        throw new DOMException("quota", "QuotaExceededError");
      }),
      removeItem: () => {},
    } as unknown as Storage;

    const failed = saveGuestDraft(
      bioDocument({ avatar: { src: "https://cdn/new.jpg" } }),
      broken,
      2000,
    );
    expect(failed.ok).toBe(false);
    expect(failed.ok === false && failed.reason).toBe("quota");
    // The previous draft is untouched: a full storage never eats the stored work.
    expect(readGuestDraft(storage, 2001)?.document.props["avatar"]?.["src"]).toBe(
      "https://cdn/keep.jpg",
    );
  });

  it("refuses a document that is too large for the draft slot", () => {
    const storage = memoryStorage();
    const huge = bioDocument({ avatar: { title: "x".repeat(GUEST_DRAFT_MAX_BYTES + 10) } });
    const result = saveGuestDraft(huge, storage, 1000);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("too-large");
    expect(storage.getItem(GUEST_DRAFT_KEY)).toBeNull();
  });

  it("reports unavailable storage instead of throwing", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;

    expect(() => saveGuestDraft(bioDocument(), broken, 1)).not.toThrow();
    expect(readGuestDraft(broken)).toBeNull();
    expect(() => clearGuestDraft(broken)).not.toThrow();
  });

  it("clears the draft on demand", () => {
    const storage = memoryStorage();
    saveGuestDraft(bioDocument(), storage, 1);
    clearGuestDraft(storage);
    expect(storage.getItem(GUEST_DRAFT_KEY)).toBeNull();
  });
});
