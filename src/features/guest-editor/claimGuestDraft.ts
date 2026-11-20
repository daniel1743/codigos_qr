import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createInitialMagicPageDocument,
  isMagicPageDocument,
  type MagicPageDocumentV1,
} from "../magic-page-editor-production/magic-document";
import { magicPageService, isDraftConflict } from "../../services/magic-page.service";
import { pageService } from "../../services/page.service";
import { profileService } from "../../services/profile.service";
import { clearGuestDraft, isLocalMediaSource } from "./guestDraft";
import type { MediaRef } from "./guestMediaStore";

/**
 * Guest Editor V1 - G6.3: hand the guest design over to an authenticated account.
 *
 * Order of operations (reuses the canonical services, invents no backend):
 *
 *   1. validate the draft document;
 *   2. ensure the profile and create-OR-RESUME the owner's single landing page;
 *   3. READ the page's current document **before writing anything** — no empty Bio is
 *      created first, so a draft always takes precedence over a blank starter;
 *   4. decide: already equal to the draft -> nothing to write; a document that is not
 *      the pristine starter -> `conflict`, zero writes;
 *   5. upload the visitor's local photos through the canonical uploader and substitute
 *      their permanent URLs in the document; a photo that cannot be resolved is
 *      reported, and any remaining `blob:`/`data:` source ABORTS the claim (a document
 *      with temporary media must never reach persistence);
 *   6. save through `magicPageService.saveDraft` (ownership-scoped), RE-READ it and
 *      compare; only then is the draft cleared and the local copies deleted.
 *
 * Residual risk (declared, not hidden): `saveDraft` has no optimistic-locking column,
 * so steps 3-6 are check-then-write. The window is bounded by reading immediately
 * before writing, the write is scoped to `owner_user_id`, and real content is never
 * overwritten; atomicity is NOT claimed.
 */
export interface GuestClaimInput {
  userId: string;
  email?: string | null;
  userMetadata?: Record<string, unknown> | null;
  supabase: SupabaseClient;
  document: MagicPageDocumentV1;
  /** Photos the visitor picked, with their IndexedDB reference. */
  mediaRefs?: MediaRef[];
}

export type GuestClaimStatus = "claimed" | "conflict" | "skipped" | "failed";

export interface GuestClaimResult {
  status: GuestClaimStatus;
  pageId?: string;
  /** Document written AND verified by re-reading it. */
  verified: boolean;
  /** Photos uploaded to permanent storage in this claim. */
  mediaUploaded: number;
  /** Photos that still live only in the visitor's browser: NOT a complete transfer. */
  mediaPendingLocal: string[];
  /**
   * Garantía real de concurrencia que ofrece el escritor usado. Con
   * `magicPageService.saveDraft` es `check-then-write` (no atómica): por eso el
   * claim revalida antes de escribir y NO declara ausencia de sobrescrituras.
   */
  concurrency: "check-then-write" | "atomic";
  /** `true` cuando se releyó el documento justo antes de escribir. */
  revalidated: boolean;
  reason?: string;
}

export interface GuestClaimDeps {
  ensureProfile?: typeof profileService.ensurePrimaryProfileForUser;
  createOrResumePage?: typeof pageService.createOrResumeInitialLandingPage;
  readDocument?: (supabase: SupabaseClient, pageId: string, userId: string) => Promise<unknown>;
  saveDocument?: typeof magicPageService.saveDraft;
  /**
   * G7 — guardado atómico (compare-and-set). Es la vía por defecto del claim.
   * Si el llamante inyecta `saveDocument` y no esta, se usa el camino antiguo
   * (`check-then-write`) y el resultado lo declara así.
   */
  saveDocumentIfUnchanged?: (
    supabase: SupabaseClient,
    pageId: string,
    document: unknown,
    expectedDocument: unknown,
  ) => Promise<MagicPageDocumentV1>;
  clearDraft?: () => void;
  /** Canonical uploader (production host uses the `avatars` bucket). */
  uploadMedia?: (
    ref: MediaRef,
    context: { userId: string; pageId: string },
  ) => Promise<string | null>;
  /** Removes the local copies once the transfer is verified. */
  deleteMedia?: (ids: string[]) => Promise<void>;
}

/**
 * Garantía de concurrencia del escritor canónico, declarada y verificada en
 * `__tests__/canonicalServicesContract.test.ts`: `saveDraft` actualiza por
 * `id` + `owner_user_id` sin columna de bloqueo optimista, así que la garantía
 * es `check-then-write`. Si algún día el servicio ofrece una guarda atómica,
 * este valor debe cambiar en el mismo commit que la prueba de contrato.
 */
export const SAVE_CONCURRENCY_GUARANTEE = "check-then-write" as const;

/**
 * `true` cuando el claim escribe con el RPC atómico (`saveDraftIfUnchanged`).
 * Es el comportamiento por defecto; solo se vuelve al camino antiguo si el
 * llamante lo inyecta explícitamente (`saveDocument`), y entonces el resultado
 * lo declara como `check-then-write` en lugar de `atomic`.
 */
export function usesAtomicDraftSave(deps: GuestClaimDeps = {}): boolean {
  return deps.saveDocumentIfUnchanged !== undefined || deps.saveDocument === undefined;
}

/** The fields that must survive the round-trip for the claim to count as verified. */
function fingerprint(document: MagicPageDocumentV1): string {
  return JSON.stringify({
    template: document.template.id,
    blocks: document.blocks.map((block) => `${block.key}:${block.type}`),
    texts: document.texts,
    props: document.props,
    removed: Object.keys(document.removed).sort(),
  });
}

/** Huella estable: `null`/no-Magic se representa igual para poder comparar. */
function stablePrint(document: unknown): string {
  return isMagicPageDocument(document) ? fingerprint(document) : "null";
}

/** `"collection.0.surface.src"` -> element `"collection.0.surface"`, prop `"src"`. */
export function splitMediaProp(prop: string): { elementId: string; propName: string } | null {
  const at = prop.lastIndexOf(".");
  if (at <= 0 || at === prop.length - 1) return null;
  return { elementId: prop.slice(0, at), propName: prop.slice(at + 1) };
}

/** Props that still point at local media: the document is not publishable. */
export function localMediaProps(document: MagicPageDocumentV1): string[] {
  const found: string[] = [];
  for (const [id, elementProps] of Object.entries(document.props)) {
    for (const [prop, value] of Object.entries(elementProps)) {
      if (isLocalMediaSource(value)) found.push(`${id}.${prop}`);
    }
  }
  return found;
}

/** Resultado interno: la garantía de concurrencia la añade el envoltorio final. */
type RawClaimResult = Omit<GuestClaimResult, "concurrency" | "revalidated"> & {
  revalidated?: boolean;
};

export async function claimGuestDraft(
  input: GuestClaimInput,
  deps: GuestClaimDeps = {},
): Promise<GuestClaimResult> {
  const raw = await runClaimGuestDraft(input, deps);
  return {
    ...raw,
    // Se declara la garantía REAL usada en este intento, no la deseada.
    concurrency: usesAtomicDraftSave(deps) ? "atomic" : SAVE_CONCURRENCY_GUARANTEE,
    // Se declara explícitamente qué caminos releyeron antes de escribir.
    revalidated: raw.revalidated ?? false,
  };
}

async function runClaimGuestDraft(
  input: GuestClaimInput,
  deps: GuestClaimDeps = {},
): Promise<RawClaimResult> {
  const {
    // Se invocan SOBRE su objeto: `ensurePrimaryProfileForUser` y
    // `createOrResumeInitialLandingPage` usan `this` internamente, así que pasarlos
    // desacoplados (`service.method`) rompía el recorrido real en el navegador.
    ensureProfile = (supabase, input) =>
      profileService.ensurePrimaryProfileForUser(supabase, input),
    createOrResumePage = (supabase, userId) =>
      pageService.createOrResumeInitialLandingPage(supabase, userId),
    readDocument = async (supabase, pageId, userId) => {
      const page = await magicPageService.getOwnedPage(supabase, pageId, userId);
      return page?.template_config ?? null;
    },
    saveDocument = (supabase, pageId, userId, document) =>
      magicPageService.saveDraft(supabase, pageId, userId, document),
    saveDocumentIfUnchanged = (supabase, pageId, document, expectedDocument) =>
      magicPageService.saveDraftIfUnchanged(supabase, pageId, document, expectedDocument),
    clearDraft = () => clearGuestDraft(),
    // Without an uploader the photos simply stay local: they are reported, never lost.
    uploadMedia = async () => null,
    deleteMedia = async () => {},
  } = deps;

  const mediaRefs = input.mediaRefs ?? [];
  /** Photos that were NOT turned into permanent URLs. */
  const stillLocal = (uploadedIds: string[]) =>
    mediaRefs.filter((ref) => !ref.id || !uploadedIds.includes(ref.id)).map((ref) => ref.prop);

  if (!isMagicPageDocument(input.document)) {
    return {
      status: "failed",
      verified: false,
      mediaUploaded: 0,
      mediaPendingLocal: mediaRefs.map((ref) => ref.prop),
      reason: "invalid-document",
    };
  }

  try {
    await ensureProfile(input.supabase, {
      userId: input.userId,
      email: input.email ?? null,
      userMetadata: input.userMetadata ?? null,
    });
    const { page } = await createOrResumePage(input.supabase, input.userId);

    // READ BEFORE WRITING: nothing is initialized here, so a real draft always takes
    // precedence over writing an empty Bio starter first.
    const current = await readDocument(input.supabase, page.id, input.userId);
    const starter = createInitialMagicPageDocument(input.document.template.id);

    if (isMagicPageDocument(current)) {
      if (fingerprint(current) === fingerprint(input.document)) {
        // A previous attempt already applied it: idempotent, nothing written again.
        clearDraft();
        await deleteMedia(mediaRefs.flatMap((ref) => (ref.id ? [ref.id] : [])));
        return {
          status: "claimed",
          pageId: page.id,
          verified: true,
          mediaUploaded: 0,
          mediaPendingLocal: [],
          reason: "already-applied",
        };
      }
      if (fingerprint(current) !== fingerprint(starter)) {
        // The account has real content: never replace it automatically.
        return {
          status: "conflict",
          pageId: page.id,
          verified: false,
          mediaUploaded: 0,
          mediaPendingLocal: mediaRefs.map((ref) => ref.prop),
          reason: "existing-content",
        };
      }
    } else if (current !== null && current !== undefined) {
      // Estado INCIERTO: hay algo guardado que este cliente no reconoce como
      // documento Magic (versión futura, formato antiguo, dato corrupto). No se
      // sobrescribe: se informa del conflicto y el borrador se conserva.
      return {
        status: "conflict",
        pageId: page.id,
        verified: false,
        mediaUploaded: 0,
        mediaPendingLocal: mediaRefs.map((ref) => ref.prop),
        reason: "unrecognized-document",
      };
    }

    // Revalidación inmediatamente antes de escribir.
    //
    // `magicPageService.saveDraft` NO tiene guarda atómica (ni `revision` ni
    // `updated_at` en el UPDATE), así que el par lectura/escritura es
    // check-then-write: entre la decisión de arriba y el UPDATE real otra sesión
    // podría haber guardado. No se puede garantizar la ausencia de sobrescritura
    // con este servicio, así que aquí se CIERRA EN LO POSIBLE la ventana: se
    // vuelve a leer y, si el documento ya no es el mismo que se leyó al decidir,
    // no se escribe nada y el borrador se conserva.
    const recheck = await readDocument(input.supabase, page.id, input.userId);
    if (stablePrint(recheck) !== stablePrint(current)) {
      return {
        status: "conflict",
        pageId: page.id,
        verified: false,
        mediaUploaded: 0,
        mediaPendingLocal: mediaRefs.map((ref) => ref.prop),
        reason: "changed-since-read",
        revalidated: true,
      };
    }

    // Photos: upload what we can and substitute the permanent URL in the document.
    const prepared: MagicPageDocumentV1 = { ...input.document, props: { ...input.document.props } };
    const uploadedIds: string[] = [];
    for (const ref of mediaRefs) {
      if (!ref.id) continue;
      const url = await uploadMedia(ref, { userId: input.userId, pageId: page.id });
      const target = splitMediaProp(ref.prop);
      if (!url || !target) continue;
      prepared.props[target.elementId] = {
        ...(prepared.props[target.elementId] ?? {}),
        [target.propName]: url,
      };
      uploadedIds.push(ref.id);
    }

    // Hard rule: a document that still points at local media never reaches persistence.
    const remaining = localMediaProps(prepared);
    if (remaining.length > 0) {
      return {
        status: "failed",
        pageId: page.id,
        verified: false,
        mediaUploaded: uploadedIds.length,
        mediaPendingLocal: stillLocal(uploadedIds),
        reason: `local-media-remaining:${remaining.join(",")}`,
        revalidated: true,
      };
    }

    // G7: se escribe con compare-and-set — `expectedDocument` es exactamente lo
    // que acabamos de leer, así que la base rechaza la escritura si otra sesión
    // guardó entremedias. Un conflicto NO se pierde: se informa y se conserva todo.
    const expectedDocument = isMagicPageDocument(current) ? current : null;
    try {
      if (usesAtomicDraftSave(deps)) {
        await saveDocumentIfUnchanged(input.supabase, page.id, prepared, expectedDocument);
      } else {
        await saveDocument(input.supabase, page.id, input.userId, prepared);
      }
    } catch (error) {
      if (isDraftConflict(error)) {
        return {
          status: "conflict",
          pageId: page.id,
          verified: false,
          mediaUploaded: uploadedIds.length,
          mediaPendingLocal: stillLocal(uploadedIds),
          reason: "atomic-conflict",
          revalidated: true,
        };
      }
      throw error;
    }

    const stored = await readDocument(input.supabase, page.id, input.userId);
    if (!isMagicPageDocument(stored) || fingerprint(stored) !== fingerprint(prepared)) {
      // Not proven: the draft and the local photos stay where they are.
      return {
        status: "failed",
        pageId: page.id,
        verified: false,
        mediaUploaded: uploadedIds.length,
        mediaPendingLocal: stillLocal(uploadedIds),
        reason: "verification-mismatch",
        revalidated: true,
      };
    }

    // Only a verified transfer clears the draft and releases the local copies.
    clearDraft();
    await deleteMedia(uploadedIds);
    return {
      status: "claimed",
      pageId: page.id,
      verified: true,
      mediaUploaded: uploadedIds.length,
      mediaPendingLocal: stillLocal(uploadedIds),
      revalidated: true,
    };
  } catch (error) {
    return {
      status: "failed",
      verified: false,
      mediaUploaded: 0,
      mediaPendingLocal: mediaRefs.map((ref) => ref.prop),
      reason: error instanceof Error ? error.message : "unknown-error",
    };
  }
}
