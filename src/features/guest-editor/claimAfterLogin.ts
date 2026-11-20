import type { SupabaseClient } from "@supabase/supabase-js";
import { editRouteSearch } from "../../components/home/editRouteSearch";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { clearCreationIntent, readCreationIntent } from "../landing-lite/creationIntent";
import type { CreationResumeTarget } from "../landing-lite/resumeCreation";
import { claimGuestDraft, type GuestClaimDeps, type GuestClaimResult } from "./claimGuestDraft";
import { readGuestDraft, type GuestDraft } from "./guestDraft";
import { createGuestMediaStore, type GuestMediaStore, type MediaRef } from "./guestMediaStore";

/**
 * Guest Editor V1 - G6.1/G6.3/G6.4: the post-login half of the guest flow.
 *
 * PRECEDENCE (the rule the task demands): if this browser holds a valid guest draft, that
 * draft is transferred — the legacy "creation intent" no longer opens a competing flow, it
 * is consumed so only one path runs.
 *
 * Continuity: the draft lives in `localStorage`, so it survives a reload AND a different
 * tab (the email-confirmation tab), which a session-scoped intent cannot do. Nothing is
 * cleared on login, on opening/closing the signup modal or on receiving the session: the
 * draft is cleared by the claim itself and only AFTER the written document was re-read.
 *
 * Media: the photos the visitor picked are still in IndexedDB. They are uploaded through
 * the SAME canonical Storage location the authenticated editor uses (`avatars` bucket,
 * `<userId>/magic-page-editor/<pageId>/...`), so no parallel backend and no new bucket.
 */
const GUEST_MEDIA_BUCKET = "avatars";

export type GuestClaimNoticeKind = "complete" | "conflict" | "recoverable";

export interface GuestClaimNotice {
  kind: GuestClaimNoticeKind;
  message: string;
  /** Motivo técnico del claim (para soporte y QA). */
  reason?: string;
  /** Photos the visitor must pick again (never silently dropped). */
  mediaPendingLocal?: string[];
}

export const GUEST_CLAIM_MESSAGES = {
  waiting: "Estamos preparando tu tarjeta…",
  transferring: "Guardando tu diseño…",
  complete: "¡Tu tarjeta se guardó correctamente!",
  conflict:
    "Ya tienes una tarjeta guardada. Conservamos tu nuevo diseño en este navegador para que decidas cómo continuar.",
  recoverable:
    "No pudimos guardar tu tarjeta todavía. Tu diseño sigue disponible en este navegador.",
  mediaPending:
    "Guardamos tu diseño, pero algunas fotos no se pudieron subir. Vuelve a elegirlas en el editor.",
} as const;

export interface GuestClaimResumeDeps {
  /** Test seam: defaults to the browser Supabase client. */
  getSupabase?: () => SupabaseClient;
  /** Test seam: defaults to the localStorage-backed reader. */
  readDraft?: () => GuestDraft | null;
  /** Test seam: defaults to the IndexedDB-backed store. */
  mediaStore?: GuestMediaStore;
  /** Test seam: defaults to the real claim. */
  claim?: typeof claimGuestDraft;
  /** Test seam: injected into the claim (services, uploader, cleaner). */
  claimDeps?: GuestClaimDeps;
  /** Test seam: defaults to the sessionStorage-backed intent reader. */
  hasPendingIntent?: () => boolean;
  /** Test seam: defaults to the real intent consumer. */
  consumeIntent?: () => void;
}

export interface GuestClaimResumeResult {
  /** Editor destination when (and only when) the transfer was verified. */
  target: CreationResumeTarget | null;
  notice: GuestClaimNotice | null;
  result: GuestClaimResult | null;
}

function extensionOf(name: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  return match ? match[1]!.toLowerCase() : "bin";
}

function safeName(name: string): string {
  return name
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .slice(0, 60);
}

/**
 * The canonical uploader: same bucket and same path convention as
 * `MagicProductionEditorHost.uploadAsset`. The file comes from IndexedDB, never from the
 * network, and its permanent public URL replaces the temporary local one.
 */
export function createCanonicalMediaUploader({
  supabase,
  mediaStore,
  now = () => Date.now(),
}: {
  supabase: SupabaseClient;
  mediaStore: GuestMediaStore;
  now?: () => number;
}) {
  return async (
    ref: MediaRef,
    context: { userId: string; pageId: string },
  ): Promise<string | null> => {
    if (!ref.id) return null;
    const stored = await mediaStore.restore([ref.id]);
    const blob = stored.get(ref.id);
    if (!blob) return null;
    const name = ref.name ?? `${ref.id}.jpg`;
    const path = `${context.userId}/magic-page-editor/${context.pageId}/${now()}-${safeName(
      name,
    )}.${extensionOf(name)}`;
    const { error } = await supabase.storage.from(GUEST_MEDIA_BUCKET).upload(path, blob, {
      contentType: ref.type ?? blob.type ?? "application/octet-stream",
      upsert: false,
    });
    if (error) return null;
    return supabase.storage.from(GUEST_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  };
}

/**
 * The single entry point the post-login destination calls.
 *
 * Returns `{ target: null, notice: null }` whenever there is nothing to do (no draft, no
 * session), so the caller keeps its normal behaviour untouched.
 */
export async function resolveGuestDraftClaim({
  getSupabase = getBrowserSupabaseClient,
  readDraft = () => readGuestDraft(),
  mediaStore,
  claim = claimGuestDraft,
  hasPendingIntent = () => readCreationIntent(),
  consumeIntent = () => clearCreationIntent(),
  claimDeps,
}: GuestClaimResumeDeps = {}): Promise<GuestClaimResumeResult> {
  try {
    const draft = readDraft();
    // No draft: the legacy flow (if any) stays exactly as it was.
    if (!draft) return { target: null, notice: null, result: null };

    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const session = data?.session ?? null;
    // Without a session nothing is consumed: the draft survives until the claim runs.
    if (!session) return { target: null, notice: null, result: null };

    // PRECEDENCE: the draft wins, so the old intent must not start a second flow.
    if (hasPendingIntent()) consumeIntent();

    const photos = mediaStore ?? createGuestMediaStore();
    const result = await claim(
      {
        userId: session.user.id,
        email: session.user.email ?? null,
        userMetadata: session.user.user_metadata ?? null,
        supabase,
        document: draft.document,
        mediaRefs: draft.mediaRefs,
      },
      {
        ...claimDeps,
        uploadMedia:
          claimDeps?.uploadMedia ?? createCanonicalMediaUploader({ supabase, mediaStore: photos }),
        deleteMedia: claimDeps?.deleteMedia ?? ((ids) => photos.remove(ids)),
      },
    );

    if (result.status === "claimed" && result.pageId) {
      const pending = result.mediaPendingLocal.length > 0;
      return {
        target: {
          to: "/pages/$pageId/edit",
          params: { pageId: result.pageId },
          search: editRouteSearch,
        },
        notice: {
          kind: "complete",
          message: pending ? GUEST_CLAIM_MESSAGES.mediaPending : GUEST_CLAIM_MESSAGES.complete,
          ...(pending ? { mediaPendingLocal: result.mediaPendingLocal } : {}),
        },
        result,
      };
    }

    const conflict = result.status === "conflict";
    return {
      target: null,
      notice: {
        kind: conflict ? "conflict" : "recoverable",
        message: conflict ? GUEST_CLAIM_MESSAGES.conflict : GUEST_CLAIM_MESSAGES.recoverable,
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.mediaPendingLocal.length > 0
          ? { mediaPendingLocal: result.mediaPendingLocal }
          : {}),
      },
      result,
    };
  } catch {
    // A failure here can only leave the visitor where they landed: no loops.
    return {
      target: null,
      notice: { kind: "recoverable", message: GUEST_CLAIM_MESSAGES.recoverable },
      result: null,
    };
  }
}
