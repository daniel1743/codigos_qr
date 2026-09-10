/**
 * CRIPQER — POWER EDITOR CONTEXTUAL DISCOVERY HINTS (P1)
 *
 * Small, non-invasive, one-time educational hints that surface useful but not
 * immediately obvious capabilities. This module is PURE: it declares the hint
 * registry and a pure trigger-deciding function, plus a UI-only "seen" store
 * (localStorage). It never mutates BioTemplateConfig, canonical persistence, or
 * any product state.
 *
 * Design constraints (see product policy):
 *   - A hint fires at most once (persisted UI preference), never on every use.
 *   - Only one hint may be visible at a time (enforced by the host component).
 *   - No document mutation, no focus steal, no modal, no paywall.
 */

/** Stable ids for discovery hints. */
export type DiscoveryHintId = "button_to_card" | "card_image";

export interface DiscoveryHint {
  readonly id: DiscoveryHintId;
  /** One short, useful sentence in Spanish. */
  readonly message: string;
  /** Optional action label (e.g. "Ver opción"). Reserved for future focus wiring. */
  readonly actionLabel?: string;
  /** Optional Inspector focus target the action would focus (never auto-mutates). */
  readonly actionFocus?: string;
}

/** Registry of approved P1 discovery hints. */
export const DISCOVERY_HINTS: Readonly<Record<DiscoveryHintId, DiscoveryHint>> = {
  button_to_card: {
    id: "button_to_card",
    message: "Puedes convertir este botón en una tarjeta y añadir una imagen.",
  },
  card_image: {
    id: "card_image",
    message: "Aquí puedes agregar una foto personalizada para destacar este contenido.",
  },
};

/** Block types that can be converted from a button into a card. */
const BUTTON_LIKE_BLOCKS: ReadonlySet<string> = new Set([
  "links",
  "buttonGroup",
  "featuredLink",
  "cta",
]);

/** Card block types that support an image. */
const CARD_BLOCKS: ReadonlySet<string> = new Set(["mediaCard"]);

/** Minimal, decoupled description of the currently selected block. */
export interface SelectedBlockSignal {
  readonly type: string;
}

/**
 * Pure decision: which hint (if any) is relevant for the currently selected
 * block. Returns null when no hint applies. Never inspects or mutates the
 * document beyond the block type.
 */
export function hintForSelection(
  block: SelectedBlockSignal | null,
): DiscoveryHintId | null {
  if (!block) return null;
  if (BUTTON_LIKE_BLOCKS.has(block.type)) return "button_to_card";
  if (CARD_BLOCKS.has(block.type)) return "card_image";
  return null;
}

/* ------------------------------------------------------------------ */
/* UI-only "seen" state (localStorage). Never canonical persistence.   */
/* ------------------------------------------------------------------ */

const SEEN_KEY = "cripqer.power-editor.discovery-hints.seen";

/** Read the set of already-seen hint ids (safe for SSR / private mode). */
export function getSeenHintIds(): ReadonlySet<DiscoveryHintId> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is DiscoveryHintId => v in DISCOVERY_HINTS));
  } catch {
    return new Set();
  }
}

/** Persist a hint id as seen. No-op on error (hint simply may reappear). */
export function markHintSeen(id: DiscoveryHintId): void {
  if (typeof window === "undefined") return;
  try {
    const next = new Set(getSeenHintIds());
    next.add(id);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
  } catch {
    /* ignore — discovery state is best-effort UI preference only */
  }
}

/** Recommended auto-dismiss duration (ms) for a discovery hint. */
export const DISCOVERY_HINT_DURATION_MS = 5000;
