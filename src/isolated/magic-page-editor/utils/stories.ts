/**
 * PHASE E2 — "Pulso activo": 24-hour stories for the public avatar.
 *
 * Product rules (approved):
 *   - the model contemplates up to 5 stories (`STORY_TOTAL_LIMIT`);
 *   - the editor creates up to 3 (`STORY_UI_LIMIT`);
 *   - only ONE can be active/visible at a time (activating one deactivates the rest);
 *   - each story lives 24 h (`STORY_TTL_MS`) from its activation timestamp.
 *
 * Storage: FLAT keys inside the avatar's own props (`doc.props["avatar"]`), which is
 * exactly what the editor's `setProp(id, key, value)` can write. So NO document
 * schema change, NO database migration and NO new write API is required, and every
 * existing document stays readable.
 *
 * Keys: `story.N.at` (ISO), `story.N.active` (`"on" | "off"`), `story.N.label`.
 * A slot without `at` counts as free, which is how removal is expressed without
 * deleting a props key.
 *
 * Pure and dependency-free: fully unit-testable, no timers, `now` is injected.
 */

/** Visible name of the feature. Renaming this one constant renames the whole UI. */
export const STORY_FEATURE_LABEL = 'Pulso activo';
/** Internal term used by the helpers/CS hooks. */
export const STORY_INTERNAL_NAME = 'story';
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
export const STORY_TOTAL_LIMIT = 5;
export const STORY_UI_LIMIT = 3;

/** Avatar props record (flat string map, same shape as `doc.props[id]`). */
export type StoryProps = Record<string, string>;

export interface StoryEntry {
  index: number;
  at: string;
  active: boolean;
  expired: boolean;
  /** Milliseconds left in the 24 h window (0 when inactive or expired). */
  remainingMs: number;
}

export type StoryField = 'at' | 'active' | 'label';

export function storyKey(index: number, field: StoryField): string {
  return `${STORY_INTERNAL_NAME}.${index}.${field}`;
}

/** Every slot that carries a real activation timestamp, lowest index first. */
export function readStories(props: StoryProps | undefined, now: number): StoryEntry[] {
  const entries: StoryEntry[] = [];
  for (let index = 0; index < STORY_TOTAL_LIMIT; index += 1) {
    const at = props?.[storyKey(index, 'at')] ?? '';
    if (!at) continue;
    const startedAt = Date.parse(at);
    if (!Number.isFinite(startedAt)) continue;
    const active = props?.[storyKey(index, 'active')] === 'on';
    const remainingMs = active ? Math.max(0, startedAt + STORY_TTL_MS - now) : 0;
    entries.push({ index, at, active, expired: active && remainingMs <= 0, remainingMs });
  }
  return entries;
}

/** Index of the story that is active AND still inside its 24 h window. */
export function activeStoryIndex(props: StoryProps | undefined, now: number): number | null {
  const found = readStories(props, now).find((entry) => entry.active && !entry.expired);
  return found ? found.index : null;
}

export function hasActiveStory(props: StoryProps | undefined, now: number): boolean {
  return activeStoryIndex(props, now) !== null;
}

/** Next free slot available to the editor UI (`null` when the UI limit is reached). */
export function nextStorySlot(props: StoryProps | undefined): number | null {
  const used = new Set(readStories(props, 0).map((entry) => entry.index));
  for (let index = 0; index < STORY_UI_LIMIT; index += 1) {
    if (!used.has(index)) return index;
  }
  return null;
}

/**
 * Single writer: returns the FLAT props patch (ready for `setProp` calls) that
 * activates, deactivates or clears a story while keeping "only one active".
 */
export function storyPatch(
  props: StoryProps | undefined,
  action: { activate?: number; deactivate?: number; clear?: number },
  now: number,
): StoryProps {
  const patch: StoryProps = {};
  if (typeof action.activate === 'number') {
    for (let cursor = 0; cursor < STORY_TOTAL_LIMIT; cursor += 1) {
      if (cursor === action.activate) continue;
      if (props?.[storyKey(cursor, 'active')] === 'on') {
        patch[storyKey(cursor, 'active')] = 'off';
      }
    }
    patch[storyKey(action.activate, 'at')] = new Date(now).toISOString();
    patch[storyKey(action.activate, 'active')] = 'on';
  }
  if (typeof action.deactivate === 'number') {
    patch[storyKey(action.deactivate, 'active')] = 'off';
  }
  if (typeof action.clear === 'number') {
    patch[storyKey(action.clear, 'at')] = '';
    patch[storyKey(action.clear, 'active')] = 'off';
  }
  return patch;
}

/** Human readable remaining time for the editor panel. */
export function formatRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return 'expirado';
  const totalMinutes = Math.floor(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${String(minutes).padStart(2, '0')} min`;
}
