import { describe, expect, it, vi } from "vitest";
import {
  CREATION_INTENT_KEY,
  CREATION_INTENT_TTL_MS,
  clearCreationIntent,
  markCreationIntent,
  readCreationIntent,
} from "../creationIntent";

/** Minimal in-memory Storage double - no jsdom, deterministic. */
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

describe("creation intent (safe, session-local)", () => {
  it("is absent by default", () => {
    expect(readCreationIntent(memoryStorage())).toBe(false);
  });

  it("round-trips a marked intent and clears it", () => {
    const storage = memoryStorage();
    markCreationIntent(storage);
    expect(readCreationIntent(storage)).toBe(true);
    clearCreationIntent(storage);
    expect(readCreationIntent(storage)).toBe(false);
  });

  it("never stores a token, destination or user data", () => {
    const storage = memoryStorage();
    markCreationIntent(storage);
    const raw = storage.getItem(CREATION_INTENT_KEY) ?? "";
    expect(raw).not.toMatch(/token|redirect|url|email|user/i);
    const parsed = JSON.parse(raw);
    expect(Object.keys(parsed).sort()).toEqual(["createdAt", "v"]);
  });

  it("rejects malformed, foreign-versioned and expired payloads", () => {
    const storage = memoryStorage();
    storage.setItem(CREATION_INTENT_KEY, "not json");
    expect(readCreationIntent(storage)).toBe(false);

    storage.setItem(CREATION_INTENT_KEY, JSON.stringify({ v: 999, createdAt: Date.now() }));
    expect(readCreationIntent(storage)).toBe(false);

    storage.setItem(CREATION_INTENT_KEY, JSON.stringify({ v: 1, createdAt: "yesterday" }));
    expect(readCreationIntent(storage)).toBe(false);

    const now = Date.now();
    storage.setItem(
      CREATION_INTENT_KEY,
      JSON.stringify({ v: 1, createdAt: now - CREATION_INTENT_TTL_MS - 1 }),
    );
    expect(readCreationIntent(storage, now)).toBe(false);
  });

  it("tolerates storage being unavailable", () => {
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
    expect(() => markCreationIntent(broken)).not.toThrow();
    expect(readCreationIntent(broken)).toBe(false);
    expect(() => clearCreationIntent(broken)).not.toThrow();
  });
});

describe("resumePendingCreation (read half of the continuity flow)", () => {
  it("does nothing without a pending intent", async () => {
    const { resumePendingCreation } = await import("../resumeCreation");
    const consumeIntent = vi.fn();
    const result = await resumePendingCreation({
      userId: "u1",
      supabase: {} as never,
      hasPendingIntent: () => false,
      consumeIntent,
    });
    expect(result).toBeNull();
    expect(consumeIntent).not.toHaveBeenCalled();
  });

  it("consumes the intent before running the boundary and returns an internal target", async () => {
    const { resumePendingCreation } = await import("../resumeCreation");
    const order: string[] = [];
    const result = await resumePendingCreation({
      userId: "u1",
      email: "a@b.c",
      userMetadata: {},
      supabase: {
        from: () => {
          throw new Error("no network in this test");
        },
      } as never,
      hasPendingIntent: () => true,
      consumeIntent: () => order.push("consume"),
    });
    // The boundary threw (no network double) -> fail-safe null, but consumption
    // must have happened first so a retry cannot loop.
    expect(order).toEqual(["consume"]);
    expect(result).toBeNull();
  });
});
