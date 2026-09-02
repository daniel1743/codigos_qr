/**
 * Stage 1 — normalize OnboardingIntentV1 into a strict internal model.
 * Also owns intent-level validation (the engine never trusts UI gating).
 */

import type {
  BusinessCategory,
  NormalizedIntent,
  OnboardingIntentV1,
  ValidationIssue,
} from "./types";
import { destinationIssueMessage, isValidDestination } from "./destinations";
import {
  PRIMARY_ACTION_TYPES,
  PRIMARY_GOALS,
  VISUAL_PERSONALITIES,
} from "./types";

/** Onboarding business ids (and common aliases) -> engine categories. */
const CATEGORY_MAP: Record<string, BusinessCategory> = {
  belleza: "beauty",
  beauty: "beauty",
  profesional: "professional",
  professional: "professional",
  creador: "creator",
  creator: "creator",
  restaurante: "food",
  "restaurante / comida": "food",
  food: "food",
  fitness: "fitness",
  wellness: "fitness",
  local: "local",
  freelancer: "freelancer",
  otro: "other",
  other: "other",
};

export function normalizeBusinessCategory(raw: string): BusinessCategory {
  const key = raw.trim().toLowerCase();
  return CATEGORY_MAP[key] ?? "other";
}

/* V1.5.1 — strict text contract. */
export const MIN_NAME = 2;
export const MIN_PROFESSION = 2;
export const MAX_NAME = 60;
export const MAX_PROFESSION = 60;
export const MAX_BIO_INPUT = 160;
export const MAX_BIO_OUTPUT = 160;

/**
 * Asset PRESENCE schemes. `blob:` counts as present for composition but is
 * never persisted (see persistableUrl). Everything else — javascript:,
 * file:, ftp:, chrome:, about:, data: and arbitrary strings — is rejected.
 */
export function isSafeAssetRef(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("https://")) return true;
  if (v.startsWith("blob:")) return true;
  // App-relative path only: never protocol-relative (//evil.example).
  return v.startsWith("/") && !v.startsWith("//");
}

/** Only these may be serialized into PageRecipeV1. */
export function isPersistableAssetRef(value: string): boolean {
  const v = value.trim();
  return isSafeAssetRef(v) && !v.startsWith("blob:");
}

export function isIsoTimestamp(value: string): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return false;
  if (!Number.isFinite(Date.parse(value))) return false;
  // Date.parse normalizes impossible calendar dates (2026-02-31 -> 2026-03-03).
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || day < 1) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function validateIntent(intent: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (path: string, code: string, message: string) =>
    issues.push({ path, code, message });

  if (!intent || typeof intent !== "object" || Array.isArray(intent)) {
    return [{ path: "intent", code: "not_an_object", message: "Intent must be an object." }];
  }
  const i = intent as Record<string, unknown>;

  if (typeof i["business_type"] !== "string" || !i["business_type"].trim()) {
    push("business_type", "required", "business_type must be a non-empty string.");
  }
  const other = i["business_other"];
  if (other !== null && typeof other !== "string") {
    push("business_other", "type", "business_other must be a string or null.");
  }
  if (
    typeof i["business_type"] === "string" &&
    normalizeBusinessCategory(i["business_type"]) === "other" &&
    (typeof other !== "string" || other.trim().length < 2)
  ) {
    push("business_other", "required", "business_other is required when the category is other.");
  }

  if (!PRIMARY_GOALS.includes(i["primary_goal"] as never)) {
    push("primary_goal", "enum", "primary_goal is not a supported goal.");
  }
  if (!VISUAL_PERSONALITIES.includes(i["visual_personality"] as never)) {
    push("visual_personality", "enum", "visual_personality is not supported.");
  }

  const identity = i["identity"];
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    push("identity", "required", "identity object is required.");
  } else {
    const id = identity as Record<string, unknown>;
    const avatar = id["avatar_preview"];
    if (avatar !== null && typeof avatar !== "string") {
      push("identity.avatar_preview", "type", "avatar_preview must be a string or null.");
    }
    const banner = id["banner_preview"];
    if (banner !== undefined && banner !== null && typeof banner !== "string") {
      push("identity.banner_preview", "type", "banner_preview must be a string or null.");
    }
    if (typeof id["name"] !== "string" || id["name"].trim().length < MIN_NAME) {
      push("identity.name", "required", "identity.name must have at least 2 characters.");
    }
    if (typeof id["profession"] !== "string" || id["profession"].trim().length < MIN_PROFESSION) {
      push("identity.profession", "required", "identity.profession must have at least 2 characters.");
    }
    if (typeof id["bio"] !== "string") {
      push("identity.bio", "type", "identity.bio must be a string.");
    }
    // Defensive length limits: hostile or corrupted payloads never reach design.
    if (typeof id["name"] === "string" && id["name"].trim().length > MAX_NAME) {
      push("identity.name", "too_long", `identity.name must be at most ${MAX_NAME} characters.`);
    }
    if (typeof id["profession"] === "string" && id["profession"].trim().length > MAX_PROFESSION) {
      push(
        "identity.profession",
        "too_long",
        `identity.profession must be at most ${MAX_PROFESSION} characters.`,
      );
    }
    if (typeof id["bio"] === "string" && id["bio"].length > MAX_BIO_INPUT) {
      push("identity.bio", "too_long", `identity.bio must be at most ${MAX_BIO_INPUT} characters.`);
    }
    if (typeof avatar === "string" && avatar.trim() && !isSafeAssetRef(avatar)) {
      push("identity.avatar_preview", "unsafe_asset", "avatar_preview uses an unsupported scheme.");
    }
    if (typeof banner === "string" && banner.trim() && !isSafeAssetRef(banner)) {
      push("identity.banner_preview", "unsafe_asset", "banner_preview uses an unsupported scheme.");
    }
  }

  const action = i["primary_action"];
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    push("primary_action", "required", "primary_action object is required.");
  } else {
    const pa = action as Record<string, unknown>;
    if (!PRIMARY_ACTION_TYPES.includes(pa["type"] as never)) {
      push("primary_action.type", "enum", "primary_action.type is not supported.");
    }
    if (typeof pa["value"] !== "string" || !pa["value"].trim()) {
      push("primary_action.value", "required", "primary_action.value is required.");
    } else if (
      PRIMARY_ACTION_TYPES.includes(pa["type"] as never) &&
      !isValidDestination(pa["type"] as never, pa["value"])
    ) {
      push(
        "primary_action.value",
        "destination_format",
        destinationIssueMessage(pa["type"] as never),
      );
    }
  }

  const meta = i["meta"];
  if (!meta || typeof meta !== "object" || (meta as Record<string, unknown>)["version"] !== "1") {
    push("meta.version", "unsupported", "Only OnboardingIntentV1 (version '1') is supported.");
  } else {
    const completed = (meta as Record<string, unknown>)["completed_at"];
    if (typeof completed !== "string" || !isIsoTimestamp(completed)) {
      push("meta.completed_at", "timestamp", "meta.completed_at must be an ISO 8601 timestamp.");
    }
  }

  return issues;
}

/** Assumes the intent already passed validateIntent(). */
/** A blob: handle is a session artifact: present, but never serializable. */
function persistableUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isPersistableAssetRef(trimmed) ? trimmed : null;
}

function isPresent(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeIntent(intent: OnboardingIntentV1): NormalizedIntent {
  const category = normalizeBusinessCategory(intent.business_type);
  const other = intent.business_other?.trim() || null;
  return {
    business_category: category,
    business_label: category === "other" ? other : null,
    primary_goal: intent.primary_goal,
    visual_personality: intent.visual_personality,
    identity: {
      name: intent.identity.name.trim().slice(0, MAX_NAME),
      profession: intent.identity.profession.trim().slice(0, MAX_PROFESSION),
      bio: intent.identity.bio.trim().slice(0, MAX_BIO_OUTPUT),
      // Blob URLs are session handles, never part of the recipe contract.
      avatar: persistableUrl(intent.identity.avatar_preview),
      banner: persistableUrl(intent.identity.banner_preview),
    },
    assets: {
      has_avatar:
        isPresent(intent.identity.avatar_preview) &&
        isSafeAssetRef(intent.identity.avatar_preview as string),
      has_banner:
        isPresent(intent.identity.banner_preview) &&
        isSafeAssetRef(intent.identity.banner_preview as string),
      has_card_media: intent.assets?.card_media === true,
    },
    primary_action: {
      type: intent.primary_action.type,
      value: intent.primary_action.value.trim(),
    },
    source_version: "1",
  };
}
