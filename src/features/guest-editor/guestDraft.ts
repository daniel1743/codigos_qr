import {
  isMagicPageDocument,
  type MagicPageDocumentV1,
} from "../magic-page-editor-production/magic-document";
import type { MediaRef } from "./guestMediaStore";

/**
 * Guest Editor V1 - the local, throwaway draft of an anonymous visitor (G4).
 *
 * Design rules (from the task):
 *   - Memory first: the editor never needs to persist anything to work.
 *   - The draft is a plain `MagicPageDocumentV1` (the real contract), versioned and
 *     with an expiry, stored in `localStorage` so a reload/navigation does not lose
 *     the work. Nothing else is stored: no token, no credential, no user data.
 *   - LOCAL MEDIA IS NEVER PERSISTED. `blob:`/`data:` sources (object URLs from the
 *     visitor's own photo) are stripped before writing and reported back, because
 *     an object URL must not become a permanent document source. The element keeps
 *     its previous/stock source instead.
 *   - A storage failure (quota, private mode) NEVER destroys the in-memory document:
 *     it is reported as a result and the visitor can keep editing.
 */
export const GUEST_DRAFT_KEY = "cripqer:guest-editor:draft:v1";
export const GUEST_DRAFT_VERSION = 2 as const;
/** One week is more than enough for a session that ends in a signup. */
export const GUEST_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Text-only cap: a draft is metadata, texts, styles, small props and media REFERENCES. */
export const GUEST_DRAFT_MAX_BYTES = 512 * 1024;

export interface GuestDraft {
  v: number;
  createdAt: number;
  updatedAt: number;
  document: MagicPageDocumentV1;
  /**
   * Photos that still live only in this browser. The draft NEVER carries the file:
   * only the reference (`guestMediaStore` keeps the Blob in IndexedDB).
   */
  mediaRefs: MediaRef[];
}

export type GuestDraftSaveResult =
  | { ok: true; bytes: number; mediaRefs: MediaRef[] }
  | { ok: false; reason: "unavailable" | "quota" | "too-large"; bytes: number };

/** `blob:` (object URL) and `data:` (inline base64) are local-only sources. */
export function isLocalMediaSource(src: string): boolean {
  return src.startsWith("blob:") || src.startsWith("data:");
}

function resolveStorage(storage?: Storage | null): Storage | null {
  if (storage) return storage;
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * A copy of the document with every local media source removed, plus the list of
 * removed props. The input document is never mutated.
 */
export function stripLocalMedia(
  document: MagicPageDocumentV1,
  resolveMediaId?: (src: string) => string | null,
): {
  document: MagicPageDocumentV1;
  mediaRefs: MediaRef[];
} {
  const mediaRefs: MediaRef[] = [];
  const props: MagicPageDocumentV1["props"] = {};
  for (const [id, elementProps] of Object.entries(document.props)) {
    const kept: Record<string, string> = {};
    for (const [prop, value] of Object.entries(elementProps)) {
      if (isLocalMediaSource(value)) {
        // A photo the visitor picked: keep only its reference to IndexedDB.
        mediaRefs.push({
          prop: `${id}.${prop}`,
          id: resolveMediaId ? resolveMediaId(value) : null,
        });
        continue;
      }
      kept[prop] = value;
    }
    props[id] = kept;
  }
  return { document: { ...document, props }, mediaRefs };
}

export function saveGuestDraft(
  document: MagicPageDocumentV1,
  storage?: Storage | null,
  now: number = Date.now(),
  options: { resolveMediaId?: (src: string) => string | null } = {},
): GuestDraftSaveResult {
  const target = resolveStorage(storage);
  const { document: safeDocument, mediaRefs } = stripLocalMedia(document, options.resolveMediaId);

  let payload: string;
  try {
    payload = JSON.stringify({
      v: GUEST_DRAFT_VERSION,
      createdAt: now,
      updatedAt: now,
      document: safeDocument,
      mediaRefs,
    } satisfies GuestDraft);
  } catch {
    // An unserializable document cannot be stored; the in-memory one stays intact.
    return { ok: false, reason: "too-large", bytes: 0 };
  }

  const bytes = payload.length;
  if (bytes > GUEST_DRAFT_MAX_BYTES) return { ok: false, reason: "too-large", bytes };
  if (!target) return { ok: false, reason: "unavailable", bytes };

  try {
    const previous = target.getItem(GUEST_DRAFT_KEY);
    const createdAt = readCreatedAt(previous, now);
    target.setItem(
      GUEST_DRAFT_KEY,
      JSON.stringify({
        v: GUEST_DRAFT_VERSION,
        createdAt,
        updatedAt: now,
        document: safeDocument,
        mediaRefs,
      } satisfies GuestDraft),
    );
    return { ok: true, bytes, mediaRefs };
  } catch {
    return { ok: false, reason: "quota", bytes };
  }
}

/** Keeps the original creation time across autosaves so the TTL is honest. */
function readCreatedAt(previous: string | null, fallback: number): number {
  if (!previous) return fallback;
  try {
    const parsed = JSON.parse(previous) as Partial<GuestDraft>;
    return typeof parsed.createdAt === "number" && Number.isFinite(parsed.createdAt)
      ? parsed.createdAt
      : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The pending draft, or `null`. Anything malformed, foreign-versioned, expired or
 * without a valid Magic document is discarded (and removed) instead of trusted.
 */
export function readGuestDraft(
  storage?: Storage | null,
  now: number = Date.now(),
): GuestDraft | null {
  const target = resolveStorage(storage);
  if (!target) return null;

  let raw: string | null;
  try {
    raw = target.getItem(GUEST_DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<GuestDraft> & { mediaPendingLocal?: unknown };
    const version = parsed?.v;
    const valid =
      parsed &&
      typeof parsed === "object" &&
      (version === GUEST_DRAFT_VERSION || version === 1) &&
      typeof parsed.createdAt === "number" &&
      typeof parsed.updatedAt === "number" &&
      Number.isFinite(parsed.createdAt) &&
      Number.isFinite(parsed.updatedAt) &&
      isMagicPageDocument(parsed.document);
    if (!valid) {
      clearGuestDraft(target);
      return null;
    }
    const age = now - (parsed.updatedAt as number);
    if (age < 0 || age > GUEST_DRAFT_TTL_MS) {
      clearGuestDraft(target);
      return null;
    }
    return {
      v: parsed.v as number,
      createdAt: parsed.createdAt as number,
      updatedAt: parsed.updatedAt as number,
      document: parsed.document as MagicPageDocumentV1,
      mediaRefs: normalizeMediaRefs(parsed),
    };
  } catch {
    clearGuestDraft(target);
    return null;
  }
}

/**
 * v1 drafts only knew the prop path (`"avatar.src"`): they are read as references
 * without an id, which means "the photo cannot be recovered, ask for it again".
 */
function normalizeMediaRefs(
  parsed: Partial<GuestDraft> & { mediaPendingLocal?: unknown },
): MediaRef[] {
  if (Array.isArray(parsed.mediaRefs)) {
    return parsed.mediaRefs
      .filter((ref): ref is MediaRef => Boolean(ref) && typeof ref.prop === "string")
      .map((ref) => ({
        prop: ref.prop,
        id: typeof ref.id === "string" && ref.id ? ref.id : null,
        ...(typeof ref.name === "string" ? { name: ref.name } : {}),
        ...(typeof ref.type === "string" ? { type: ref.type } : {}),
        ...(typeof ref.size === "number" ? { size: ref.size } : {}),
      }));
  }
  if (Array.isArray(parsed.mediaPendingLocal)) {
    return parsed.mediaPendingLocal
      .filter((prop): prop is string => typeof prop === "string")
      .map((prop) => ({ prop, id: null }));
  }
  return [];
}

export function clearGuestDraft(storage?: Storage | null): void {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.removeItem(GUEST_DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
}
