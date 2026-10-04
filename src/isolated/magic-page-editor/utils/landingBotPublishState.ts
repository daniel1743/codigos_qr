/**
 * Cross-layer bridge for the landing bot's PUBLISHED state.
 *
 * The production host knows the published snapshot; the Magic editor only knows
 * the draft. This tiny one-responsibility store lets the editor warn the owner
 * when the bot is enabled in the draft but still not published, without coupling
 * the editor to Supabase or to the production host (and without an import cycle).
 *
 * `undefined` means "unknown" (no host mounted / not resolved yet), so consumers
 * MUST stay silent in that case.
 */
import { useSyncExternalStore } from "react";

export type LandingBotPublishedState = boolean | undefined;

let publishedBotEnabled: LandingBotPublishedState;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called by the host with the published snapshot's bot state. */
export function setLandingBotPublishedEnabled(next: LandingBotPublishedState): void {
  if (next === publishedBotEnabled) return;
  publishedBotEnabled = next;
  for (const listener of listeners) listener();
}

/** React hook; `undefined` means unknown, so the warning must stay hidden. */
export function useLandingBotPublishedEnabled(): LandingBotPublishedState {
  return useSyncExternalStore(
    subscribe,
    () => publishedBotEnabled,
    () => undefined,
  );
}
