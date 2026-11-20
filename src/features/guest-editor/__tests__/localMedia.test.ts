// @vitest-environment happy-dom
/**
 * Guest Editor V1 - G3 tests: local photo preview without any remote write.
 *
 * The store takes its URL factories by injection, so the test proves the contract
 * (validation, tracking, revocation) without a real object URL.
 */
import { describe, expect, it, vi } from "vitest";
import { LOCAL_MEDIA_MAX_BYTES, createLocalMediaStore } from "../localMedia";

function imageFile(name = "foto.jpg", type = "image/jpeg", size = 1024): File {
  const file = new File([new Uint8Array(size)], name, { type });
  return file;
}

describe("local media store (G3)", () => {
  it("creates a local source for an image and tracks it", async () => {
    let counter = 0;
    const created: string[] = [];
    const revoked: string[] = [];
    const store = createLocalMediaStore({
      createObjectUrl: () => `blob:local/${++counter}`,
      revokeObjectUrl: (url) => revoked.push(url),
    });

    const first = await store.createLocalSource(imageFile());
    const second = await store.createLocalSource(imageFile("otra.png", "image/png"));
    expect(first).toBe("blob:local/1");
    expect(second).toBe("blob:local/2");
    expect(store.pendingCount()).toBe(2);
    created.push(first, second);

    store.revokeAll();
    expect(revoked.sort()).toEqual(created.sort());
    expect(store.pendingCount()).toBe(0);
    // Idempotent: a second cleanup must not revoke twice.
    store.revokeAll();
    expect(revoked).toHaveLength(2);
  });

  it("rejects non-images and files above the size limit", async () => {
    const store = createLocalMediaStore({ createObjectUrl: () => "blob:never" });
    await expect(store.createLocalSource(imageFile("doc.pdf", "application/pdf"))).rejects.toThrow(
      /imagen válida/i,
    );
    await expect(
      store.createLocalSource(imageFile("grande.jpg", "image/jpeg", LOCAL_MEDIA_MAX_BYTES + 1)),
    ).rejects.toThrow(/10 MB/);
    expect(store.pendingCount()).toBe(0);
  });

  it("reports a browser without object URLs instead of failing silently", async () => {
    const store = createLocalMediaStore({
      createObjectUrl: () => {
        throw new Error("Este navegador no permite previsualizar fotos locales.");
      },
    });
    await expect(store.createLocalSource(imageFile())).rejects.toThrow(/navegador/i);
    expect(store.pendingCount()).toBe(0);
  });

  it("does not create any remote request when producing a local source", async () => {
    const originalFetch = globalThis.fetch;
    const calls: unknown[] = [];
    globalThis.fetch = ((...args: unknown[]) => {
      calls.push(args);
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as typeof fetch;

    try {
      const store = createLocalMediaStore({ createObjectUrl: () => "blob:local/only" });
      await store.createLocalSource(imageFile());
      store.revokeAll();
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toHaveLength(0);
  });
});
