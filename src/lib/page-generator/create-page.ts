/**
 * PAGES_7 — generated Page creation flow.
 *
 *   validate owner input
 *     → semantic mapping (existing adapter rules)
 *       → existing Engine V2 generator (server boundary)
 *         → existing canonical validation (validateTemplate)
 *           → existing `pageService.createPage`   (owner = authenticated user)
 *             → existing `pageCanonicalService.saveDraft` (pages.template_config)
 *               → read-back verification
 *
 * No generator-owned persistence, no profile write, no automatic publish.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { readCanonicalPageEnvelope, type CanonicalPageEnvelopeV1 } from "@/lib/canonical-page";
import type { OnboardingV2GenerationResult } from "@/lib/onboarding-v2/engine-v2-generation";
import type { OnboardingIntentV2 } from "@/lib/onboarding-v2/types";
import type { ContentSourceV2 } from "@/lib/parametric-engine-v2/power-editor/content-source";
import type { GenerateV2Options } from "@/lib/parametric-engine-v2/power-editor/generate-v2";
import { pageCanonicalService } from "@/services/page-canonical.service";
import { pageService } from "@/services/page.service";
import type { Page } from "@/types/database";
import { mapGeneratedPageToEngineInput, toCanonicalPageDocument } from "./adapter";
import { generatePageCanonicalFn } from "./generation-server";
import { GENERATED_PAGE_OBJECTIVE_PRESETS } from "./objective-presets";
import { validateGeneratedPageInput } from "./validation";
import type { GeneratedPageInput } from "./types";

export type CreateGeneratedPageFailureCode =
  | "INVALID_INPUT"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "GENERATION_FAILED"
  | "INVALID_ENGINE_OUTPUT"
  | "PAGE_CREATE_FAILED"
  | "CANONICAL_SAVE_FAILED"
  | "VERIFICATION_FAILED";

export interface CreateGeneratedPageSuccess {
  status: "CREATED";
  page: Page;
  envelope: CanonicalPageEnvelopeV1;
  generation: {
    candidateId: string;
    score: number;
    family: string;
    layout: string;
  };
  diagnostics: string[];
}

export interface CreateGeneratedPageFailure {
  status: "FAILED";
  code: CreateGeneratedPageFailureCode;
  error: string;
  issues?: string[];
  /** Present when the Page row was created but the canonical draft could not be saved. */
  pageId?: string;
}

export type CreateGeneratedPageResult = CreateGeneratedPageSuccess | CreateGeneratedPageFailure;

export interface GeneratedPageEngineRequest {
  intent: OnboardingIntentV2;
  contentBlocks?: Partial<ContentSourceV2>;
  engineOptions?: GenerateV2Options;
  now?: string;
}

export interface CreateGeneratedPageInput {
  supabase: SupabaseClient;
  profileId: string;
  input: GeneratedPageInput;
  now?: string;
  /** Injectable server generation call. Defaults to the server boundary. */
  generate?: (request: GeneratedPageEngineRequest) => Promise<OnboardingV2GenerationResult>;
}

export interface PersistGeneratedCanonicalPageInput {
  supabase: SupabaseClient;
  userId: string;
  profileId: string;
  title: string;
  pageType: Page["page_type"];
  editorConfig: unknown;
  generation: CreateGeneratedPageSuccess["generation"];
  diagnostics?: string[];
}

function failure(
  code: CreateGeneratedPageFailureCode,
  error: string,
  extra: { issues?: string[]; pageId?: string } = {},
): CreateGeneratedPageFailure {
  return { status: "FAILED", code, error, ...extra };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

async function defaultGenerate(
  request: GeneratedPageEngineRequest,
): Promise<OnboardingV2GenerationResult> {
  return generatePageCanonicalFn({
    data: {
      intent: request.intent as never,
      ...(request.contentBlocks ? { contentBlocks: request.contentBlocks as never } : {}),
      ...(request.engineOptions ? { engineOptions: request.engineOptions as never } : {}),
      ...(request.now ? { now: request.now } : {}),
    },
  });
}

/**
 * Reuses the authoritative child-page persistence tail for callers that have
 * already run generation elsewhere. This function never invokes an engine.
 */
export async function persistGeneratedCanonicalPage({
  supabase,
  userId,
  profileId,
  title,
  pageType,
  editorConfig,
  generation,
  diagnostics = [],
}: PersistGeneratedCanonicalPageInput): Promise<CreateGeneratedPageResult> {
  const canonical = toCanonicalPageDocument(editorConfig);
  if (!canonical.ok) {
    return failure("INVALID_ENGINE_OUTPUT", "La página generada no es válida.", {
      issues: canonical.errors,
    });
  }

  let page: Page;
  try {
    page = await pageService.createPage(supabase, {
      userId,
      profileId: profileId.trim(),
      title: title.trim(),
      pageType,
    });
  } catch (error) {
    return failure(
      "PAGE_CREATE_FAILED",
      error instanceof Error ? error.message : "No se pudo crear la página.",
    );
  }

  try {
    const persisted = await pageCanonicalService.saveDraft(
      supabase,
      page.id,
      userId,
      canonical.envelope.editorConfig,
    );
    if (stableJson(persisted.editorConfig) !== stableJson(canonical.envelope.editorConfig)) {
      return failure("VERIFICATION_FAILED", "La página guardada no coincide con lo generado.", {
        pageId: page.id,
      });
    }
  } catch (error) {
    return failure(
      "CANONICAL_SAVE_FAILED",
      error instanceof Error ? error.message : "No se pudo guardar la página generada.",
      { pageId: page.id },
    );
  }

  const verified = await pageService.getOwnPageById(supabase, page.id, userId);
  const verifiedEnvelope = readCanonicalPageEnvelope(verified?.template_config);
  if (
    !verifiedEnvelope ||
    stableJson(verifiedEnvelope.editorConfig) !== stableJson(canonical.envelope.editorConfig)
  ) {
    return failure("VERIFICATION_FAILED", "No pudimos verificar la página generada.", {
      pageId: page.id,
    });
  }

  return {
    status: "CREATED",
    page: verified ?? page,
    envelope: verifiedEnvelope,
    generation,
    diagnostics,
  };
}

export async function createGeneratedPage({
  supabase,
  profileId,
  input,
  now,
  generate = defaultGenerate,
}: CreateGeneratedPageInput): Promise<CreateGeneratedPageResult> {
  const validation = validateGeneratedPageInput(input);
  if (!validation.valid) {
    return failure("INVALID_INPUT", "Completa los datos que faltan para generar la página.", {
      issues: validation.issues.map((issue) => `${issue.path}: ${issue.message}`),
    });
  }

  const preset = GENERATED_PAGE_OBJECTIVE_PRESETS[input.objective];

  let userId: string;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.id) return failure("AUTH_REQUIRED", "Debes iniciar sesión para generar.");
    userId = user.id;
  } catch {
    return failure("AUTH_REQUIRED", "Debes iniciar sesión para generar.");
  }

  const normalizedProfileId = profileId.trim();
  if (!normalizedProfileId) return failure("FORBIDDEN", "No encontramos tu cuenta activa.");

  const mapped = mapGeneratedPageToEngineInput(input, now ? { now } : {});
  if (!mapped.ok) {
    return failure(
      "GENERATION_FAILED",
      mapped.errors.join(" ") || "No se pudo preparar la página.",
      { issues: mapped.errors },
    );
  }

  let generated: OnboardingV2GenerationResult;
  try {
    generated = await generate({
      intent: mapped.intent,
      ...(mapped.contentBlocks ? { contentBlocks: mapped.contentBlocks } : {}),
      ...(mapped.engineOptions ? { engineOptions: mapped.engineOptions } : {}),
      ...(now ? { now } : {}),
    });
  } catch (error) {
    return failure(
      "GENERATION_FAILED",
      error instanceof Error ? error.message : "No se pudo generar la página.",
    );
  }
  if (generated.status !== "GENERATED") {
    return failure(
      generated.status === "INVALID_ENGINE_OUTPUT" ? "INVALID_ENGINE_OUTPUT" : "GENERATION_FAILED",
      generated.errors.join(" ") || "No se pudo generar la página.",
      { issues: generated.errors },
    );
  }

  return persistGeneratedCanonicalPage({
    supabase,
    userId,
    profileId: normalizedProfileId,
    title: input.title,
    pageType: preset.pageType,
    editorConfig: generated.editorConfig,
    generation: {
      candidateId: generated.generationMetadata.candidateId,
      score: generated.generationMetadata.score,
      family: generated.generationMetadata.family,
      layout: generated.generationMetadata.layout,
    },
    diagnostics: mapped.diagnostics.warnings,
  });
}
