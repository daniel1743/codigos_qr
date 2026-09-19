import type { TemplateBlock } from "../types";

export type HeaderMode = "custom" | "full-hero";

/**
 * Header mode is derived from the canonical block/profile shape. It is not
 * persisted as a second flag, so switching modes cannot leave stale mode
 * state behind.
 */
export function getHeaderMode(blocks: readonly TemplateBlock[]): HeaderMode {
  return blocks.some((block) => block.type === "hero") ? "full-hero" : "custom";
}

export function isFullHeroActive(blocks: readonly TemplateBlock[]): boolean {
  return getHeaderMode(blocks) === "full-hero";
}

/** Replace the singleton Hero while preserving all non-Hero authored blocks. */
export function replaceHeroPresetBlocks(
  currentBlocks: readonly TemplateBlock[],
  presetBlocks: readonly TemplateBlock[],
): TemplateBlock[] {
  const firstHeroIndex = currentBlocks.findIndex((block) => block.type === "hero");
  const remaining = currentBlocks.filter((block) => block.type !== "hero");
  const replacement = [
    ...presetBlocks.filter((block) => block.type === "hero"),
    ...presetBlocks.filter((block) => block.type !== "hero"),
  ];
  const insertionIndex = firstHeroIndex < 0 ? 0 : Math.min(firstHeroIndex, remaining.length);
  remaining.splice(insertionIndex, 0, ...replacement);
  return remaining;
}
