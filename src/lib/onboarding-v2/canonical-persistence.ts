import type { SupabaseClient } from "@supabase/supabase-js";
import { validateCanonicalPageEnvelope, type CanonicalPageEnvelopeV1 } from "@/lib/canonical-page";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import type { OnboardingV2GenerationResult } from "./engine-v2-generation";
import { validateOnboardingIntentV2 } from "./validation";
import type { OnboardingIntentV2 } from "./types";
import { canonicalPageService } from "@/services/canonical-page.service";

export type OnboardingV2PersistenceFailureCode =
  | "INVALID_INPUT"
  | "GENERATION_FAILED"
  | "INVALID_ENGINE_OUTPUT"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "PERSISTENCE_FAILED"
  | "VERIFICATION_FAILED";

export interface PersistOnboardingGeneratedPageV2Input {
  supabase: SupabaseClient;
  profileId: string;
  intent: OnboardingIntentV2;
  generatedResult: OnboardingV2GenerationResult;
}

export interface OnboardingV2PersistenceSuccess {
  status: "PERSISTED";
  profileId: string;
  authUserId: string;
  persisted: CanonicalPageEnvelopeV1;
  verified: CanonicalPageEnvelopeV1;
  preservedTopLevelKeys: string[];
}

export interface OnboardingV2PersistenceFailure {
  status: "NOT_PERSISTED";
  code: OnboardingV2PersistenceFailureCode;
  error: string;
}

export type OnboardingV2PersistenceResult =
  OnboardingV2PersistenceSuccess | OnboardingV2PersistenceFailure;

const CANONICAL_KEYS = new Set(["schemaVersion", "editorConfig"]);

function failure(
  code: OnboardingV2PersistenceFailureCode,
  error: string,
): OnboardingV2PersistenceFailure {
  return { status: "NOT_PERSISTED", code, error };
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

function topLevelEntries(envelope: CanonicalPageEnvelopeV1): Record<string, unknown> {
  return envelope as unknown as Record<string, unknown>;
}

function validateGeneratedConfig(
  generatedResult: OnboardingV2GenerationResult,
): OnboardingV2PersistenceFailure | null {
  if (generatedResult.status !== "GENERATED") {
    return failure(
      "GENERATION_FAILED",
      `Onboarding generation did not complete: ${generatedResult.status}.`,
    );
  }

  const validation = validateTemplate(generatedResult.editorConfig);
  if (!validation.valid) {
    return failure(
      "INVALID_ENGINE_OUTPUT",
      validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" "),
    );
  }

  return null;
}

function validatePersistedEnvelope(
  envelope: CanonicalPageEnvelopeV1 | null,
): OnboardingV2PersistenceFailure | null {
  const validation = validateCanonicalPageEnvelope(envelope);
  return validation.valid ? null : failure("VERIFICATION_FAILED", validation.errors.join(" "));
}

function comparePreservedNamespaces(
  original: CanonicalPageEnvelopeV1 | null,
  next: CanonicalPageEnvelopeV1,
): { keys: string[]; error?: string } {
  if (!original) return { keys: [] };

  const originalEntries = topLevelEntries(original);
  const nextEntries = topLevelEntries(next);
  const keys = Object.keys(originalEntries).filter((key) => !CANONICAL_KEYS.has(key));
  const missing = keys.filter((key) => !Object.prototype.hasOwnProperty.call(nextEntries, key));
  if (missing.length) {
    return {
      keys,
      error: `Canonical persistence removed existing namespaces: ${missing.join(", ")}.`,
    };
  }

  const changed = keys.filter(
    (key) => stableJson(originalEntries[key]) !== stableJson(nextEntries[key]),
  );
  return changed.length
    ? { keys, error: `Canonical persistence changed existing namespaces: ${changed.join(", ")}.` }
    : { keys };
}

/**
 * Internal authenticated handoff from Onboarding V2 generation to the
 * canonical profile persistence boundary. This function never performs a
 * direct profiles update and never persists a non-generated result.
 */
export async function persistOnboardingGeneratedPageV2({
  supabase,
  profileId,
  intent,
  generatedResult,
}: PersistOnboardingGeneratedPageV2Input): Promise<OnboardingV2PersistenceResult> {
  const normalizedProfileId = profileId.trim();
  if (!normalizedProfileId) return failure("INVALID_INPUT", "profileId is required.");

  const intentValidation = validateOnboardingIntentV2(intent);
  if (!intentValidation.valid) {
    return failure(
      "INVALID_INPUT",
      intentValidation.issues
        .map((issue) => `${issue.path || "intent"}: ${issue.message}`)
        .join(" "),
    );
  }

  const generatedValidation = validateGeneratedConfig(generatedResult);
  if (generatedValidation) return generatedValidation;
  if (generatedResult.status !== "GENERATED")
    return failure("GENERATION_FAILED", "Generation failed.");

  let authUserId: string;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.id) return failure("AUTH_REQUIRED", "An authenticated user is required.");
    authUserId = user.id;
  } catch {
    return failure("AUTH_REQUIRED", "An authenticated user is required.");
  }

  try {
    const { data: ownedProfile, error: ownershipError } = await supabase
      .from("profiles")
      .select("id,user_id")
      .eq("id", normalizedProfileId)
      .eq("user_id", authUserId)
      .maybeSingle();

    if (ownershipError) {
      return failure("PERSISTENCE_FAILED", `Ownership check failed: ${ownershipError.message}`);
    }
    if (!ownedProfile) {
      return failure("FORBIDDEN", "Profile is not owned by the authenticated user.");
    }

    const original = await canonicalPageService.get(supabase, normalizedProfileId);
    const persisted = await canonicalPageService.save(
      supabase,
      normalizedProfileId,
      generatedResult.editorConfig,
    );
    const persistedValidation = validatePersistedEnvelope(persisted);
    if (persistedValidation) return persistedValidation;

    const preservation = comparePreservedNamespaces(original, persisted);
    if (preservation.error) return failure("VERIFICATION_FAILED", preservation.error);

    const verified = await canonicalPageService.get(supabase, normalizedProfileId);
    const verifiedValidation = validatePersistedEnvelope(verified);
    if (verifiedValidation) return verifiedValidation;
    if (!verified)
      return failure("VERIFICATION_FAILED", "Persisted canonical envelope was not readable.");

    if (stableJson(verified.editorConfig) !== stableJson(generatedResult.editorConfig)) {
      return failure(
        "VERIFICATION_FAILED",
        "Persisted editorConfig does not structurally match the generated editorConfig.",
      );
    }

    return {
      status: "PERSISTED",
      profileId: normalizedProfileId,
      authUserId,
      persisted,
      verified,
      preservedTopLevelKeys: preservation.keys,
    };
  } catch (error) {
    return failure(
      "PERSISTENCE_FAILED",
      error instanceof Error ? error.message : "Canonical persistence failed.",
    );
  }
}
