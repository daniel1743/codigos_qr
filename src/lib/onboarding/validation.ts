/**
 * CRIPQER — Onboarding invariants.
 *
 * buildIntent() validates EVERY required invariant independently of the UI.
 * Step gating in the components is a convenience, never the contract.
 */

import { BUSINESS_TYPES, OTHER_BUSINESS_ID } from "./config";
import {
  IDENTITY_LIMITS,
  PRIMARY_ACTION_TYPES,
  PRIMARY_GOALS,
  VISUAL_PERSONALITIES,
  type IntentFieldError,
  type OnboardingDraft,
  type OnboardingIntentV1,
  type PersistedDraft,
  type PrimaryActionType,
} from "./types";

/* ----------------------------------------------------- destination values */

export function validateActionValue(type: PrimaryActionType, raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Completa este campo para continuar.";
  switch (type) {
    case "whatsapp": {
      const digits = value.replace(/[^\d]/g, "");
      if (digits.length < 8 || digits.length > 15) {
        return "Escribe un número válido con código de país.";
      }
      return null;
    }
    case "booking":
    case "website": {
      try {
        const url = new URL(value.startsWith("http") ? value : `https://${value}`);
        if (!url.hostname.includes(".")) return "Escribe una dirección web válida.";
        return null;
      } catch {
        return "Escribe una dirección web válida.";
      }
    }
    case "instagram": {
      const handle = value.replace(/^@/, "");
      if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) return "Escribe un usuario de Instagram válido.";
      return null;
    }
    case "email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return "Escribe un correo válido.";
      return null;
    }
    default:
      return "Selecciona una acción válida.";
  }
}

/* ------------------------------------------------------------ full intent */

const BUSINESS_IDS = new Set(BUSINESS_TYPES.map((b) => b.id));

/** Returns every invariant the draft violates. Empty array = valid contract. */
export function validateDraft(draft: OnboardingDraft): IntentFieldError[] {
  const errors: IntentFieldError[] = [];

  const businessType = draft.business_type?.trim() ?? "";
  if (!businessType || !BUSINESS_IDS.has(businessType)) errors.push("business_type");

  const other = draft.business_other?.trim() ?? "";
  if (businessType === OTHER_BUSINESS_ID && other.length < 2) errors.push("business_other");

  if (!draft.primary_goal || !PRIMARY_GOALS.includes(draft.primary_goal)) {
    errors.push("primary_goal");
  }
  if (!draft.visual_personality || !VISUAL_PERSONALITIES.includes(draft.visual_personality)) {
    errors.push("visual_personality");
  }

  const name = draft.identity.name.trim();
  if (name.length < 2 || name.length > IDENTITY_LIMITS.name) errors.push("identity.name");

  const profession = draft.identity.profession.trim();
  if (profession.length < 2 || profession.length > IDENTITY_LIMITS.profession) {
    errors.push("identity.profession");
  }

  const actionType = draft.primary_action.type;
  if (!actionType || !PRIMARY_ACTION_TYPES.includes(actionType)) {
    errors.push("primary_action.type");
  } else if (validateActionValue(actionType, draft.primary_action.value)) {
    errors.push("primary_action.value");
  }

  return errors;
}

/**
 * Deterministic OnboardingIntentV1 builder. Returns null unless every
 * invariant holds — it never trusts UI gating.
 */
export function buildIntent(draft: OnboardingDraft): OnboardingIntentV1 | null {
  if (validateDraft(draft).length > 0) return null;

  const businessType = draft.business_type!.trim();
  return {
    business_type: businessType,
    business_other:
      businessType === OTHER_BUSINESS_ID ? (draft.business_other?.trim() || null) : null,
    primary_goal: draft.primary_goal!,
    visual_personality: draft.visual_personality!,
    identity: {
      name: draft.identity.name.trim(),
      profession: draft.identity.profession.trim(),
      bio: draft.identity.bio.trim().slice(0, IDENTITY_LIMITS.bio),
      avatar_preview: draft.identity.avatar_preview,
    },
    primary_action: {
      type: draft.primary_action.type!,
      value: draft.primary_action.value.trim(),
    },
    meta: { version: "1", completed_at: new Date().toISOString() },
  };
}

/* ------------------------------------------------------------ persistence */

/**
 * Strips the in-memory avatar object URL. Blob URLs are per-session handles;
 * persisting them yields dead references on reload.
 */
export function toPersistedDraft(draft: OnboardingDraft): PersistedDraft {
  const { avatar_preview: _omit, ...identity } = draft.identity;
  return { ...draft, identity };
}

export function fromPersistedDraft(
  raw: unknown,
  empty: OnboardingDraft,
): OnboardingDraft {
  // Lightweight manual shape validation — no schema library. Any malformed
  // or incompatible persisted draft falls back to the empty draft instead
  // of risking runtime .trim()/shape errors downstream.
  if (!isValidPersistedDraft(raw)) return empty;
  const parsed = raw as PersistedDraft;
  return {
    ...empty,
    ...parsed,
    identity: {
      ...empty.identity,
      ...parsed.identity,
      // Never restored from storage.
      avatar_preview: null,
    },
    primary_action: { ...empty.primary_action, ...parsed.primary_action },
  };
}

const isStringOrNull = (v: unknown): v is string | null =>
  v === null || typeof v === "string";

function isValidPersistedDraft(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const d = raw as Record<string, unknown>;

  if (!isStringOrNull(d["business_type"])) return false;
  if (!isStringOrNull(d["business_other"])) return false;
  if (d["primary_goal"] !== null && !PRIMARY_GOALS.includes(d["primary_goal"] as never)) {
    return false;
  }
  if (
    d["visual_personality"] !== null &&
    !VISUAL_PERSONALITIES.includes(d["visual_personality"] as never)
  ) {
    return false;
  }

  const identity = d["identity"];
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) return false;
  const id = identity as Record<string, unknown>;
  if (typeof id["name"] !== "string") return false;
  if (typeof id["profession"] !== "string") return false;
  if (typeof id["bio"] !== "string") return false;

  const action = d["primary_action"];
  if (!action || typeof action !== "object" || Array.isArray(action)) return false;
  const pa = action as Record<string, unknown>;
  if (pa["type"] !== null && !PRIMARY_ACTION_TYPES.includes(pa["type"] as never)) return false;
  if (typeof pa["value"] !== "string") return false;

  return true;
}
