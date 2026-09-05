import type { SupabaseClient } from "@supabase/supabase-js";

import { profileService } from "@/services/profile.service";
import { linkService } from "@/services/link.service";
import type { Profile, ProfileLink } from "@/types/database";
import {
  extractInstagramHandle,
  isValidEmail,
  isValidHttpUrl,
  isValidWhatsApp,
  normalizePhoneDigits,
} from "@/lib/parametric-engine-v2/destinations";
import {
  type OnboardingV2GenerationResult,
  type OnboardingV2GenerationFailure,
  type OnboardingV2GenerationSuccess,
} from "./engine-v2-generation";
import { generateOnboardingV2PageFn } from "./generation-server";
import {
  persistOnboardingGeneratedPageV2,
  type OnboardingV2PersistenceFailure,
  type OnboardingV2PersistenceSuccess,
} from "./canonical-persistence";
import type { OnboardingIntentV2 } from "./types";

export type OnboardingV2HandoffPhase = "GENERATING" | "PERSISTING";

export type OnboardingV2HandoffFailureCode =
  | "AUTH_REQUIRED"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_LOOKUP_FAILED"
  | "GENERATION_FAILED"
  | "PERSISTENCE_FAILED";

export interface CompleteOnboardingV2HandoffInput {
  supabase: SupabaseClient;
  intent: OnboardingIntentV2;
  now?: string;
  onPhase?: (phase: OnboardingV2HandoffPhase) => void;
  generate?: (intent: OnboardingIntentV2, now?: string) => Promise<OnboardingV2GenerationResult>;
}

export interface OnboardingV2HandoffSuccess {
  status: "SUCCESS";
  profileId: string;
  generated: OnboardingV2GenerationSuccess;
  persistence: OnboardingV2PersistenceSuccess;
  basic: OnboardingV2BasicLanding;
}

export interface OnboardingV2HandoffFailure {
  status: "FAILED";
  code: OnboardingV2HandoffFailureCode;
  error: string;
  generated?: OnboardingV2GenerationFailure;
  persistence?: OnboardingV2PersistenceFailure | OnboardingV2PersistenceSuccess;
}

export type OnboardingV2HandoffResult = OnboardingV2HandoffSuccess | OnboardingV2HandoffFailure;

export interface OnboardingV2BasicLanding {
  profile: Profile;
  links: ProfileLink[];
  skippedActionIndexes: number[];
}

export function buildBasicEditorHandoffUrl(profileId: string): string {
  return `/editor?profileId=${encodeURIComponent(profileId)}`;
}

function handoffFailure(
  code: OnboardingV2HandoffFailureCode,
  error: string,
  extra: {
    generated?: OnboardingV2GenerationFailure;
    persistence?: OnboardingV2PersistenceFailure | OnboardingV2PersistenceSuccess;
  } = {},
): OnboardingV2HandoffFailure {
  return { status: "FAILED", code, error, ...extra };
}

function actionLabel(action: OnboardingIntentV2["actions"]["primary"]): string {
  if (action?.label?.trim()) return action.label.trim();
  switch (action?.type) {
    case "whatsapp":
      return "WhatsApp";
    case "call":
      return "Llamar";
    case "book":
      return "Reservar";
    case "buy":
      return "Comprar";
    case "request_quote":
      return "Pedir presupuesto";
    case "website":
      return "Sitio web";
    case "menu":
      return "Ver menú";
    case "follow":
      return "Seguir en redes";
    case "email":
      return "Email";
    case "contact":
      return "Contactar";
    default:
      return "Enlace";
  }
}

function actionToBasicLink(
  action: OnboardingIntentV2["actions"]["primary"],
): { platform: string; label: string; url: string } | null {
  const value = action?.value?.trim() ?? "";
  if (!action || !value) return null;

  switch (action.type) {
    case "whatsapp":
      return isValidWhatsApp(value)
        ? {
            platform: "whatsapp",
            label: actionLabel(action),
            url: `https://wa.me/${normalizePhoneDigits(value)}`,
          }
        : null;
    case "call":
      return isValidWhatsApp(value)
        ? {
            platform: "phone",
            label: actionLabel(action),
            url: `tel:${normalizePhoneDigits(value)}`,
          }
        : null;
    case "email":
      return isValidEmail(value)
        ? { platform: "email", label: actionLabel(action), url: `mailto:${value}` }
        : null;
    case "follow": {
      const handle = extractInstagramHandle(value);
      return handle
        ? {
            platform: "instagram",
            label: actionLabel(action),
            url: `https://www.instagram.com/${handle}/`,
          }
        : null;
    }
    case "book":
    case "buy":
    case "request_quote":
    case "website":
    case "menu":
    case "contact":
    case "other":
      return isValidHttpUrl(value)
        ? { platform: "website", label: actionLabel(action), url: value }
        : null;
  }
}

function sameLink(left: ProfileLink, right: { platform: string; url: string }): boolean {
  return (
    left.platform.trim().toLowerCase() === right.platform.trim().toLowerCase() &&
    left.url.trim().toLowerCase() === right.url.trim().toLowerCase()
  );
}

async function landBasicValues(
  supabase: SupabaseClient,
  profile: Profile,
  intent: OnboardingIntentV2,
): Promise<OnboardingV2BasicLanding> {
  const updatedProfile = await profileService.updateBasicEditorProfile(supabase, profile.id, {
    display_name: intent.identity.displayName,
    profession: intent.identity.professionOrActivity,
    ...(intent.identity.bio !== undefined ? { bio: intent.identity.bio } : {}),
  });
  let links = await linkService.getProfileLinks(supabase, profile.id);
  const actions = [intent.actions.primary, ...intent.actions.secondary];
  const skippedActionIndexes: number[] = [];

  for (const [index, action] of actions.entries()) {
    const link = actionToBasicLink(action);
    if (!link) {
      if (action?.value?.trim()) skippedActionIndexes.push(index);
      continue;
    }
    if (links.some((existing) => sameLink(existing, link))) continue;
    if (links.length >= 8) {
      skippedActionIndexes.push(index);
      continue;
    }
    const created = await linkService.createProfileLink(supabase, {
      profile_id: profile.id,
      platform: link.platform,
      label: link.label,
      url: link.url,
      enabled: true,
      sort_order: links.length,
    });
    links = [...links, created];
  }

  return { profile: updatedProfile, links, skippedActionIndexes };
}

/**
 * Internal-only post-generation handoff. It resolves the authenticated user's
 * existing profile and never creates a profile or a second editor session.
 */
export async function completeOnboardingV2Handoff({
  supabase,
  intent,
  now,
  onPhase,
  generate = async (nextIntent, nextNow) =>
    generateOnboardingV2PageFn({
      data: { intent: nextIntent, ...(nextNow ? { now: nextNow } : {}) },
    }),
}: CompleteOnboardingV2HandoffInput): Promise<OnboardingV2HandoffResult> {
  onPhase?.("GENERATING");
  const generated = await generate(intent, now);
  if (generated.status !== "GENERATED") {
    return handoffFailure(
      "GENERATION_FAILED",
      generated.errors.join(" ") || "No se pudo generar la página.",
      { generated },
    );
  }

  let userId: string;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.id) {
      return handoffFailure("AUTH_REQUIRED", "Debes iniciar sesión para guardar tu página.");
    }
    userId = user.id;
  } catch {
    return handoffFailure("AUTH_REQUIRED", "Debes iniciar sesión para guardar tu página.");
  }

  let profile;
  try {
    profile = await profileService.getProfileByUserId(supabase, userId);
  } catch (error) {
    return handoffFailure(
      "PROFILE_LOOKUP_FAILED",
      error instanceof Error ? error.message : "No se pudo resolver tu perfil existente.",
    );
  }
  if (!profile?.id) {
    return handoffFailure(
      "PROFILE_NOT_FOUND",
      "No se encontró un perfil existente para completar el handoff.",
    );
  }

  onPhase?.("PERSISTING");
  const persistence = await persistOnboardingGeneratedPageV2({
    supabase,
    profileId: profile.id,
    intent,
    generatedResult: generated,
  });
  if (persistence.status !== "PERSISTED") {
    return handoffFailure("PERSISTENCE_FAILED", persistence.error, { persistence });
  }

  try {
    const basic = await landBasicValues(supabase, profile, intent);
    return { status: "SUCCESS", profileId: persistence.profileId, generated, persistence, basic };
  } catch (error) {
    return handoffFailure(
      "PERSISTENCE_FAILED",
      error instanceof Error
        ? error.message
        : "No se pudieron preparar los campos del Basic Editor.",
      { persistence },
    );
  }
}
