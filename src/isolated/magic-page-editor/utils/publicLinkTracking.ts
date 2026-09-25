/**
 * PUBLIC (preview) LINK TRACKING — single click-intent source for Magic pages.
 *
 * Magic templates never instrument their own links: every external destination
 * (WhatsApp / Instagram / Facebook / TikTok / YouTube / LinkedIn / generic URL)
 * is rendered through the shared `Editable` anchor layer, so the click intent
 * is resolved ONCE here and handed to the host callback
 * (`EditorProvider.onTrack` → route `handleTrack` → canonical analytics writer).
 *
 * This module is pure and dependency-free on purpose:
 *   - it never writes analytics itself (no dual write, no duplicated writer);
 *   - it never calls preventDefault, so normal anchor navigation is untouched;
 *   - it only runs in public preview mode, so editor clicks stay editor clicks.
 *
 * `type` is intentionally `link_click` for every Magic anchor. The canonical
 * resolver (`resolveCanonicalClickType`) short-circuits `cta_click` BEFORE it
 * inspects the destination, which would collapse a WhatsApp button into a
 * generic CTA click. Sending `link_click` keeps the existing resolver (and its
 * platform normalization) authoritative for Magic destinations.
 */

export interface PublicLinkTrackEvent {
  /** Renderer intent consumed by `resolveCanonicalClickType`. */
  type: string;
  /** Stable Magic element id (e.g. `hero.cta`, `hero.social.0`). */
  itemId?: string;
  /** Stable Magic block key (e.g. `hero`, `links`). */
  blockId?: string;
  url?: string;
  label?: string;
}

/** Longest label handed to the analytics writer (server bounds it again). */
const MAX_LABEL_LENGTH = 120;

/**
 * `#section` anchors are in-page navigation, and the bare `https://` / `http://`
 * strings are the Magic template placeholder for "no destination configured
 * yet". Neither is a real external click, so neither may be tracked.
 */
export function isTrackablePublicHref(href: string | null | undefined): href is string {
  const value = (href ?? "").trim();
  if (!value) return false;
  if (value.startsWith("#")) return false;
  if (value === "https://" || value === "http://") return false;
  return true;
}

/** Flatten and bound a human label; returns null when there is nothing useful. */
export function normalizeTrackedLabel(text: string | null | undefined): string | null {
  const value = (text ?? "").replace(/\s+/g, " ").trim();
  if (!value) return null;
  return value.length > MAX_LABEL_LENGTH ? `${value.slice(0, MAX_LABEL_LENGTH - 1)}…` : value;
}

/**
 * Build the canonical click intent for one anchor click, or null when the
 * destination is not a trackable external link.
 *
 * Identity is never collapsed: `itemId` is the stable Magic element id and
 * `blockId` its block, so two different WhatsApp buttons stay two different
 * Top Links rows. The visible text is preferred as the label (it is what the
 * visitor actually clicked) and the element label is the fallback.
 */
export function buildPublicLinkTrackEvent(input: {
  href: string | null | undefined;
  itemId: string;
  blockId?: string | undefined;
  label?: string | undefined;
  visibleText?: string | null | undefined;
}): PublicLinkTrackEvent | null {
  if (!isTrackablePublicHref(input.href)) return null;

  const label = normalizeTrackedLabel(input.visibleText) ?? normalizeTrackedLabel(input.label);

  return {
    type: "link_click",
    itemId: input.itemId,
    ...(input.blockId ? { blockId: input.blockId } : {}),
    url: input.href.trim(),
    ...(label ? { label } : {}),
  };
}
