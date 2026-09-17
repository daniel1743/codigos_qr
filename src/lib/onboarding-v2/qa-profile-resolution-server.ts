import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { profileService } from "@/services/profile.service";

export interface QaOwnedProfile {
  id: string;
  displayName: string;
  publicId: string | null;
}

export type QaProfileResolutionResult =
  | { status: "RESOLVED"; profileId: string; profiles: QaOwnedProfile[] }
  | { status: "SELECT_PROFILE"; profiles: QaOwnedProfile[] }
  | { status: "AUTH_REQUIRED"; profiles: []; message: string }
  | { status: "NO_PROFILES"; profiles: []; message: string }
  | { status: "PROFILE_NOT_AVAILABLE"; profiles: []; message: string }
  | { status: "LOOKUP_FAILED"; profiles: []; message: string };

export interface ResolveQaProfileInput {
  requestedProfileId?: string | null;
  /** Browser session credential. The server verifies it with Supabase. */
  accessToken: string;
}

function resolved(profileId: string, profiles: QaOwnedProfile[]): QaProfileResolutionResult {
  return { status: "RESOLVED", profileId, profiles };
}

function empty(
  status: "AUTH_REQUIRED" | "NO_PROFILES" | "PROFILE_NOT_AVAILABLE" | "LOOKUP_FAILED",
  message: string,
) {
  return { status, profiles: [], message } as QaProfileResolutionResult;
}

function toOwnedProfiles(rows: unknown): QaOwnedProfile[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const value = row as Record<string, unknown>;
    if (typeof value["id"] !== "string" || !value["id"].trim()) return [];
    return [
      {
        id: value["id"],
        displayName:
          typeof value["display_name"] === "string" && value["display_name"].trim()
            ? value["display_name"].trim()
            : "Perfil sin nombre",
        publicId: typeof value["public_id"] === "string" ? value["public_id"] : null,
      },
    ];
  });
}

/**
 * Resolves only profiles owned by the authenticated Supabase user.
 * A requested profile id is merely a hint and is never trusted without the
 * user_id filter below succeeding.
 */
export async function resolveQaProfile(
  supabase: Pick<SupabaseClient, "auth" | "from">,
  requestedProfileId?: string | null,
): Promise<QaProfileResolutionResult> {
  let userId: string;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.id) {
      return empty("AUTH_REQUIRED", "Debes iniciar sesión para ejecutar esta prueba QA.");
    }
    userId = user.id;
  } catch {
    return empty("AUTH_REQUIRED", "Debes iniciar sesión para ejecutar esta prueba QA.");
  }

  let profiles: QaOwnedProfile[];
  try {
    // Use the same repository authority as /editor. The service query is
    // still scoped by the authenticated user and never accepts a browser
    // supplied user id.
    if (requestedProfileId?.trim()) {
      const requested = await profileService.getProfileByIdForUser(
        supabase as SupabaseClient,
        requestedProfileId.trim(),
        userId,
      );
      profiles = requested ? toOwnedProfiles([requested]) : [];
    } else {
      const ownedProfiles = await profileService.getProfilesByUserId(
        supabase as SupabaseClient,
        userId,
      );
      profiles = toOwnedProfiles(ownedProfiles);
    }
  } catch {
    return empty("LOOKUP_FAILED", "No pudimos verificar tus perfiles.");
  }

  const requested = requestedProfileId?.trim() || null;
  if (requested) {
    return profiles[0]
      ? resolved(profiles[0].id, profiles)
      : empty("PROFILE_NOT_AVAILABLE", "No encontramos un perfil disponible para esta sesión.");
  }

  if (profiles.length === 0) {
    return empty("NO_PROFILES", "No tienes un perfil disponible para esta prueba QA.");
  }
  const onlyProfile = profiles[0];
  if (onlyProfile && profiles.length === 1) return resolved(onlyProfile.id, profiles);
  return { status: "SELECT_PROFILE", profiles };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateInput(value: unknown): ResolveQaProfileInput {
  if (!isRecord(value)) throw new Error("Los datos de resolución de perfil no son válidos.");
  const accessToken = typeof value["accessToken"] === "string" ? value["accessToken"].trim() : "";
  const requestedProfileId = value["requestedProfileId"];
  if (
    !accessToken ||
    (requestedProfileId !== undefined &&
      requestedProfileId !== null &&
      typeof requestedProfileId !== "string")
  ) {
    throw new Error("Falta la credencial de sesión para resolver el perfil.");
  }
  return {
    accessToken,
    requestedProfileId:
      typeof requestedProfileId === "string" ? requestedProfileId.trim() || null : null,
  };
}

/** QA-only server boundary. It never accepts a user id or ownership claim. */
export const resolveQaProfileFn = createServerFn({ method: "POST", strict: false })
  .validator(validateInput)
  .handler(async ({ data }): Promise<QaProfileResolutionResult> => {
    const [{ createClient }, { env }] = await Promise.all([
      import("@supabase/supabase-js"),
      import("../env"),
    ]);
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });
    return resolveQaProfile(supabase, data.requestedProfileId);
  });
