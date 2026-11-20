// @vitest-environment happy-dom
/**
 * Guest Editor V1 - G6.2 tests: the local photo store.
 *
 * The test environment has no IndexedDB, so the orchestration runs against an injected
 * adapter (exactly the seam the host uses) and the real IndexedDB adapter stays a thin
 * layer exercised by the browser QA run.
 */
import { describe, expect, it, vi } from "vitest";
import {
  GUEST_MEDIA_TTL_MS,
  createGuestMediaStore,
  hasIndexedDb,
  type MediaAdapter,
  type StoredMedia,
} from "../guestMediaStore";

function memoryAdapter(): MediaAdapter & { entries: Map<string, StoredMedia> } {
  const entries = new Map<string, StoredMedia>();
  return {
    entries,
    async put(entry) {
      entries.set(entry.id, entry);
    },
    async get(id) {
      return entries.get(id) ?? null;
    },
    async list(ids) {
      return ids.map((id) => entries.get(id)).filter((entry): entry is StoredMedia => !!entry);
    },
    async delete(ids) {
      ids.forEach((id) => entries.delete(id));
    },
    async clear() {
      entries.clear();
    },
    async pruneBefore(timestamp) {
      const stale = [...entries.values()]
        .filter((entry) => entry.createdAt < timestamp)
        .map((entry) => entry.id);
      stale.forEach((id) => entries.delete(id));
      return stale.length;
    },
  };
}

function photo(name = "foto.jpg"): File {
  return new File([new Uint8Array([1, 2, 3, 4])], name, { type: "image/jpeg" });
}

describe("guestMediaStore (G6.2)", () => {
  it("keeps the file and returns it as a blob by its reference", async () => {
    const adapter = memoryAdapter();
    const store = createGuestMediaStore(adapter);

    await store.putFile(photo(), "media-1", 1_000);

    expect(adapter.entries.get("media-1")?.name).toBe("foto.jpg");
    expect(adapter.entries.get("media-1")?.type).toBe("image/jpeg");
    const restored = await store.restore(["media-1", "media-que-no-existe"]);
    expect(restored.size).toBe(1);
    expect(restored.get("media-1")?.size).toBe(4);
  });

  it("removes only the transferred photos", async () => {
    const adapter = memoryAdapter();
    const store = createGuestMediaStore(adapter);
    await store.putFile(photo("a.jpg"), "a", 1_000);
    await store.putFile(photo("b.jpg"), "b", 1_000);

    await store.remove(["a"]);

    const left = await store.restore(["a", "b"]);
    expect([...left.keys()]).toEqual(["b"]);
  });

  it("clears everything", async () => {
    const adapter = memoryAdapter();
    const store = createGuestMediaStore(adapter);
    await store.putFile(photo(), "a", 1_000);
    await store.clear();
    expect((await store.restore(["a"])).size).toBe(0);
  });

  it("prunes photos older than the draft TTL and keeps fresh ones", async () => {
    const adapter = memoryAdapter();
    const store = createGuestMediaStore(adapter);
    const now = 30 * 24 * 60 * 60 * 1000;
    await store.putFile(photo("vieja.jpg"), "vieja", now - GUEST_MEDIA_TTL_MS - 1);
    await store.putFile(photo("nueva.jpg"), "nueva", now - 1000);

    const pruned = await store.prune(now);

    expect(pruned).toBe(1);
    expect([...(await store.restore(["vieja", "nueva"])).keys()]).toEqual(["nueva"]);
  });

  it("degrades instead of throwing when the storage fails (quota, private mode)", async () => {
    const failing: MediaAdapter = {
      put: vi.fn(async () => {
        throw new Error("QuotaExceededError");
      }),
      get: vi.fn(async () => null),
      list: vi.fn(async () => []),
      delete: vi.fn(async () => undefined),
      clear: vi.fn(async () => undefined),
      pruneBefore: vi.fn(async () => 0),
    };
    const store = createGuestMediaStore(failing);

    await expect(store.putFile(photo(), "media-1", 1_000)).resolves.toBe("media-1");
    expect((await store.restore(["media-1"])).size).toBe(0);
    await expect(store.remove(["media-1"])).resolves.toBeUndefined();
    await expect(store.clear()).resolves.toBeUndefined();
  });

  it("reports availability honestly in an environment without IndexedDB", async () => {
    expect(hasIndexedDb()).toBe(false);
    const store = createGuestMediaStore();
    expect(store.available).toBe(false);
    // No IndexedDB: the call is a no-op, never a crash.
    await expect(store.putFile(photo(), "media-1")).resolves.toBe("media-1");
    expect((await store.restore(["media-1"])).size).toBe(0);
  });
});
