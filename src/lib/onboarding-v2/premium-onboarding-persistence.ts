import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import {
  persistGeneratedCanonicalPage,
  type CreateGeneratedPageSuccess,
} from "@/lib/page-generator/create-page";
import type { BioTemplateConfig } from "@/premium-template-studio/types";
import type { PageType } from "@/types/database";
import { profileService } from "@/services/profile.service";

export type PremiumOnboardingPersistenceFailureCode =
  | "INVALID_INPUT"
  | "AUTH_REQUIRED"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_LOOKUP_FAILED"
  | "FORBIDDEN"
  | "INVALID_CANONICAL"
  | "PAGE_CREATE_FAILED"
  | "CANONICAL_SAVE_FAILED"
  | "VERIFICATION_FAILED"
  | "HANDOFF_COMPLETION_FAILED";

export interface PersistPremiumOnboardingGeneratedPageInput {
  supabase: SupabaseClient;
  profileId: string;
  editorConfig: BioTemplateConfig;
  title: string;
  pageType: PageType;
  generation: CreateGeneratedPageSuccess["generation"];
}

export interface PersistPremiumOnboardingGeneratedPageSuccess {
  status: "PERSISTED";
  pageId: string;
  publicId: string;
  profileId: string;
  pageType: PageType;
  title: string;
  editorPath: string;
  /** QA-only read-after-write evidence; not used to drive the UI. */
  editorConfig: BioTemplateConfig;
}

export interface PersistPremiumOnboardingGeneratedPageFailure {
  status: "FAILED";
  code: PremiumOnboardingPersistenceFailureCode;
  error: string;
  pageId?: string;
  publicId?: string;
  editorPath?: string;
}

export type PersistPremiumOnboardingGeneratedPageResult =
  PersistPremiumOnboardingGeneratedPageSuccess | PersistPremiumOnboardingGeneratedPageFailure;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(
  code: PremiumOnboardingPersistenceFailureCode,
  error: string,
  extra: Pick<
    PersistPremiumOnboardingGeneratedPageFailure,
    "pageId" | "publicId" | "editorPath"
  > = {},
): PersistPremiumOnboardingGeneratedPageFailure {
  return { status: "FAILED", code, error, ...extra };
}

function isValidProfileId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function mapPagePersistenceFailure(
  result: Extract<Awaited<ReturnType<typeof persistGeneratedCanonicalPage>>, { status: "FAILED" }>,
): PersistPremiumOnboardingGeneratedPageFailure {
  const code =
    result.code === "INVALID_ENGINE_OUTPUT"
      ? "INVALID_CANONICAL"
      : result.code === "PAGE_CREATE_FAILED"
        ? "PAGE_CREATE_FAILED"
        : result.code === "CANONICAL_SAVE_FAILED"
          ? "CANONICAL_SAVE_FAILED"
          : "VERIFICATION_FAILED";
  const pageId = result.pageId;
  return failure(code, result.error, {
    ...(pageId ? { pageId, editorPath: `/pages/${encodeURIComponent(pageId)}/edit` } : {}),
  });
}

/**
 * Server-only premium onboarding coordinator.
 *
 * The document has already been generated before this function is called. It
 * only authenticates, checks profile ownership, revalidates the canonical
 * document, and delegates child-page persistence to the existing PAGES_7
 * authority. It never calls Engine V2 and never writes the profile canonical.
 */
export async function persistPremiumOnboardingGeneratedPage({
  supabase,
  profileId,
  editorConfig,
  title,
  pageType,
  generation,
}: PersistPremiumOnboardingGeneratedPageInput): Promise<PersistPremiumOnboardingGeneratedPageResult> {
  const normalizedProfileId = profileId.trim();
  const normalizedTitle = title.trim();
  if (!isValidProfileId(normalizedProfileId) || !normalizedTitle || !pageType) {
    return failure("INVALID_INPUT", "No pudimos identificar el perfil o la página.");
  }

  let userId: string;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.id)
      return failure("AUTH_REQUIRED", "Debes iniciar sesión para guardar tu página.");
    userId = user.id;
  } catch {
    return failure("AUTH_REQUIRED", "Debes iniciar sesión para guardar tu página.");
  }

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id,user_id")
      .eq("id", normalizedProfileId)
      .maybeSingle();
    if (error) return failure("PROFILE_LOOKUP_FAILED", "No pudimos verificar tu perfil.");
    if (!profile) return failure("PROFILE_NOT_FOUND", "No encontramos el perfil seleccionado.");
    if (profile.user_id !== userId) {
      return failure("FORBIDDEN", "No tienes permiso para crear una página en este perfil.");
    }
  } catch {
    return failure("PROFILE_LOOKUP_FAILED", "No pudimos verificar tu perfil.");
  }

  const canonicalValidation = validateTemplate(editorConfig);
  if (!canonicalValidation.valid) {
    return failure("INVALID_CANONICAL", "La página generada no pasó la validación canónica.");
  }

  let persisted: Awaited<ReturnType<typeof persistGeneratedCanonicalPage>>;
  try {
    persisted = await persistGeneratedCanonicalPage({
      supabase,
      userId,
      profileId: normalizedProfileId,
      title: normalizedTitle,
      pageType,
      editorConfig,
      generation,
    });
  } catch {
    return failure("VERIFICATION_FAILED", "No pudimos verificar la página guardada.");
  }
  if (persisted.status !== "CREATED") return mapPagePersistenceFailure(persisted);

  const editorPath = `/pages/${encodeURIComponent(persisted.page.id)}/edit`;
  try {
    // This is the existing Basic Editor invite authority. "declined" is the
    // repository's existing cleared/non-redirecting state; it is only written
    // after the child page and canonical read-after-write have succeeded.
    await profileService.patchBasicEditorTemplateConfig(supabase, normalizedProfileId, {
      onboarding_v2_invite_status: "declined",
    });
  } catch {
    return failure(
      "HANDOFF_COMPLETION_FAILED",
      "La página se guardó, pero no pudimos completar el handoff al editor.",
      {
        pageId: persisted.page.id,
        publicId: persisted.page.public_id,
        editorPath,
      },
    );
  }

  return {
    status: "PERSISTED",
    pageId: persisted.page.id,
    publicId: persisted.page.public_id,
    profileId: normalizedProfileId,
    pageType,
    title: persisted.page.title,
    editorPath,
    editorConfig: persisted.envelope.editorConfig,
  };
}
