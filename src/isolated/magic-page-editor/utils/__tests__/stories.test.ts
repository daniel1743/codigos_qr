import { describe, expect, it } from "vitest";
import {
  STORY_TOTAL_LIMIT,
  STORY_TTL_MS,
  STORY_UI_LIMIT,
  activeStoryIndex,
  formatRemaining,
  nextStorySlot,
  readStories,
  storyKey,
  storyPatch,
} from "../stories";

const NOW = Date.parse("2026-10-04T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();
const apply = (props: Record<string, string>, patch: Record<string, string>) => ({ ...props, ...patch });
const active = (index: number) => ({ [storyKey(index, "at")]: hoursAgo(1), [storyKey(index, "active")]: "on" });

/**
 * E2 — "Pulso activo": the model contemplates 5 stories, the editor creates at
 * most 3, only one is visible at a time and every story lives 24 h.
 */
describe("Pulso activo — 24 h story model", () => {
  it("contemplates 5 stories while the editor creates at most 3", () => {
    expect(STORY_TOTAL_LIMIT).toBe(5);
    expect(STORY_UI_LIMIT).toBe(3);
    expect(STORY_TTL_MS).toBe(24 * 3_600_000);
  });

  it("reads only slots that carry a real activation timestamp", () => {
    expect(readStories(undefined, NOW)).toEqual([]);
    expect(readStories({ [storyKey(0, "at")]: "" }, NOW)).toEqual([]);
    expect(readStories({ [storyKey(0, "at")]: "not-a-date" }, NOW)).toEqual([]);
    expect(readStories(active(0), NOW)).toHaveLength(1);
  });

  it("expires a story 24 h after activation", () => {
    const [fresh] = readStories(active(0), NOW);
    expect(fresh?.expired).toBe(false);
    expect(fresh?.remainingMs).toBe(23 * 3_600_000);

    const stale = { [storyKey(0, "at")]: hoursAgo(25), [storyKey(0, "active")]: "on" };
    expect(readStories(stale, NOW)[0]?.expired).toBe(true);
    expect(activeStoryIndex(stale, NOW)).toBeNull();
  });

  it("keeps exactly one story active at a time", () => {
    let props: Record<string, string> = {};
    props = apply(props, storyPatch(props, { activate: 0 }, NOW));
    expect(activeStoryIndex(props, NOW)).toBe(0);

    props = apply(props, storyPatch(props, { activate: 2 }, NOW));
    expect(props[storyKey(0, "active")]).toBe("off");
    expect(activeStoryIndex(props, NOW)).toBe(2);
    expect(readStories(props, NOW).filter((entry) => entry.active)).toHaveLength(1);
  });

  it("offers the next free slot only inside the editor limit", () => {
    let props: Record<string, string> = {};
    expect(nextStorySlot(props)).toBe(0);
    props = apply(props, storyPatch(props, { activate: 0 }, NOW));
    expect(nextStorySlot(props)).toBe(1);
    props = apply(props, storyPatch(props, { activate: 1 }, NOW));
    props = apply(props, storyPatch(props, { activate: 2 }, NOW));
    expect(nextStorySlot(props)).toBeNull();
    expect(readStories(props, NOW)).toHaveLength(STORY_UI_LIMIT);
  });

  it("deactivates without losing the timestamp and clears a slot", () => {
    let props: Record<string, string> = { [storyKey(0, "at")]: hoursAgo(3), [storyKey(0, "active")]: "on" };
    props = apply(props, storyPatch(props, { deactivate: 0 }, NOW));
    expect(props[storyKey(0, "at")]).toBe(hoursAgo(3));
    expect(activeStoryIndex(props, NOW)).toBeNull();

    props = apply(props, storyPatch(props, { clear: 0 }, NOW));
    expect(readStories(props, NOW)).toEqual([]);
    expect(nextStorySlot(props)).toBe(0);
  });

  it("formats the remaining window for the panel", () => {
    expect(formatRemaining(0)).toBe("expirado");
    expect(formatRemaining(45 * 60_000)).toBe("45 min");
    expect(formatRemaining((23 * 60 + 59) * 60_000)).toBe("23 h 59 min");
  });

  it("stays backward compatible with documents that never had stories", () => {
    const legacy = { shape: "circle", badge: "on", badgeColor: "#0B1F3A" };
    expect(readStories(legacy, NOW)).toEqual([]);
    expect(activeStoryIndex(legacy, NOW)).toBeNull();
    expect(storyPatch(legacy, { deactivate: 0 }, NOW)).toEqual({ [storyKey(0, "active")]: "off" });
  });
});
