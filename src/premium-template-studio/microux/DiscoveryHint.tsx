/**
 * CRIPQER — POWER EDITOR DISCOVERY HINT HOST
 *
 * Self-contained, non-blocking toast that surfaces at most ONE discovery hint
 * at a time, auto-dismisses, and never steals focus. It respects
 * `prefers-reduced-motion` and keeps all state outside canonical persistence.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useStudio } from "../state/StudioProvider";
import {
  DISCOVERY_HINTS,
  DISCOVERY_HINT_DURATION_MS,
  getSeenHintIds,
  hintForSelection,
  markHintSeen,
} from "./discoveryHints";
import type { DiscoveryHintId } from "./discoveryHints";

/**
 * Observes editor selection and shows a subtle one-time hint when a relevant
 * control is selected. Enforces "one hint at a time" and "once per hint id".
 */
export function DiscoveryHintHost() {
  const { state } = useStudio();
  const selectedBlockId = state.selectedBlockId;

  const [activeId, setActiveId] = useState<DiscoveryHintId | null>(null);
  const seenRef = useRef<ReadonlySet<DiscoveryHintId>>(getSeenHintIds());
  const queuedRef = useRef<DiscoveryHintId[]>([]);
  const timerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setActiveId(null);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showNext = useCallback(() => {
    const next = queuedRef.current.shift();
    if (!next) {
      setActiveId(null);
      return;
    }
    setActiveId(next);
    markHintSeen(next);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setActiveId(null);
      showNext();
    }, DISCOVERY_HINT_DURATION_MS);
  }, []);

  useEffect(() => {
    const block = selectedBlockId
      ? state.config.blocks.find((b) => b.id === selectedBlockId)
      : null;
    const candidate = hintForSelection(block ? { type: block.type } : null);

    if (!candidate) return;
    if (seenRef.current.has(candidate)) return;
    if (activeId === candidate || queuedRef.current.includes(candidate)) return;

    seenRef.current = getSeenHintIds();
    if (seenRef.current.has(candidate)) return;

    // One hint at a time: if nothing is showing, show immediately; otherwise
    // keep it queued until the current one dismisses.
    if (!activeId) {
      setActiveId(candidate);
      markHintSeen(candidate);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setActiveId(null);
        showNext();
      }, DISCOVERY_HINT_DURATION_MS);
    } else {
      queuedRef.current.push(candidate);
    }
  }, [selectedBlockId, state.config.blocks, activeId, showNext]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const hint = activeId ? DISCOVERY_HINTS[activeId] : null;
  if (!hint) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[60] w-[min(92vw,24rem)] -translate-x-1/2"
    >
      <div className="pts-floating-enter pointer-events-auto flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground shadow-lg">
        <p className="min-w-0 flex-1 leading-snug">{hint.message}</p>
        <button
          type="button"
          aria-label="Cerrar sugerencia"
          onClick={dismiss}
          className="shrink-0 rounded-md p-0.5 text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
