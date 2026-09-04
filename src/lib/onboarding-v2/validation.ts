import {
  ACTION_SOURCES_V2,
  ACTION_TYPES_V2,
  BUSINESS_CATEGORIES_V2,
  COMMERCIAL_MODES_V2,
  CONTENT_NEEDS_V2,
  DENSITIES_V2,
  EXPERIENCE_INTENTS_V2,
  MEDIA_PREFERENCES_V2,
  PRIMARY_GOALS_V2,
  VISUAL_DIRECTIONS_V2,
  type ActionIntentV2,
  type OnboardingIntentV2,
} from "./types";

export interface OnboardingV2ValidationIssue {
  path: string;
  code:
    | "required"
    | "invalid_type"
    | "invalid_enum"
    | "invalid_format"
    | "invalid_asset_ref"
    | "duplicate";
  message: string;
}

export interface OnboardingV2ValidationResult {
  valid: boolean;
  issues: OnboardingV2ValidationIssue[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasValue = <T extends readonly string[]>(values: T, value: unknown): value is T[number] =>
  typeof value === "string" && values.includes(value);

function issue(
  issues: OnboardingV2ValidationIssue[],
  path: string,
  code: OnboardingV2ValidationIssue["code"],
  message: string,
): void {
  issues.push({ path, code, message });
}

function validateUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function validateActionValue(type: ActionIntentV2["type"], value: string): boolean {
  switch (type) {
    case "whatsapp":
    case "call": {
      const digits = value.replace(/[^\d]/g, "");
      return digits.length >= 8 && digits.length <= 15;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    case "follow":
      return /^@?[A-Za-z0-9._]{2,50}$/.test(value) || validateUrl(value);
    case "book":
    case "buy":
    case "request_quote":
    case "website":
    case "menu":
    case "contact":
      return validateUrl(value);
    case "other":
      return value.length > 0;
    default:
      return false;
  }
}

function validateAction(
  action: unknown,
  path: string,
  issues: OnboardingV2ValidationIssue[],
): void {
  if (!isRecord(action)) {
    issue(issues, path, "invalid_type", "The action must be an object.");
    return;
  }
  const type = action["type"];
  const source = action["source"];
  const label = action["label"];
  const value = action["value"];
  if (!hasValue(ACTION_TYPES_V2, type)) {
    issue(issues, `${path}.type`, "invalid_enum", "The action type is not supported.");
  }
  if (!hasValue(ACTION_SOURCES_V2, source)) {
    issue(issues, `${path}.source`, "invalid_enum", "The action source is not supported.");
  }
  if (label !== undefined && !isNonEmptyString(label)) {
    issue(
      issues,
      `${path}.label`,
      "invalid_format",
      "The action label must be non-empty when present.",
    );
  }
  if (value !== undefined) {
    if (!isNonEmptyString(value)) {
      issue(
        issues,
        `${path}.value`,
        "invalid_format",
        "The action value must be non-empty when present.",
      );
    } else if (hasValue(ACTION_TYPES_V2, type) && !validateActionValue(type, value.trim())) {
      issue(
        issues,
        `${path}.value`,
        "invalid_format",
        "The action destination has an invalid format.",
      );
    }
  } else if (source === "user" && !["book", "buy", "request_quote"].includes(String(type))) {
    issue(
      issues,
      `${path}.value`,
      "required",
      "A user-selected action requires a destination value.",
    );
  }
}

function validateAssetRef(
  value: unknown,
  path: string,
  issues: OnboardingV2ValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isNonEmptyString(value) || value.trim().toLowerCase().startsWith("blob:")) {
    issue(
      issues,
      path,
      "invalid_asset_ref",
      "Asset references must be durable and cannot be browser blob URLs.",
    );
  }
}

export function validateOnboardingIntentV2(value: unknown): OnboardingV2ValidationResult {
  const issues: OnboardingV2ValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        { path: "", code: "invalid_type", message: "The onboarding intent must be an object." },
      ],
    };
  }

  if (value["version"] !== "2")
    issue(issues, "version", "invalid_enum", "The contract version must be 2.");

  const identity = value["identity"];
  if (!isRecord(identity)) {
    issue(issues, "identity", "required", "Identity is required.");
  } else {
    if (!isNonEmptyString(identity["displayName"]))
      issue(issues, "identity.displayName", "required", "Display name is required.");
    if (!isNonEmptyString(identity["professionOrActivity"])) {
      issue(
        issues,
        "identity.professionOrActivity",
        "required",
        "Profession or activity is required.",
      );
    }
    if (identity["bio"] !== undefined && typeof identity["bio"] !== "string") {
      issue(issues, "identity.bio", "invalid_type", "Bio must be a string when present.");
    }
    validateAssetRef(identity["avatarAssetRef"], "identity.avatarAssetRef", issues);
    validateAssetRef(identity["bannerAssetRef"], "identity.bannerAssetRef", issues);
  }

  const business = value["business"];
  if (!isRecord(business)) {
    issue(issues, "business", "required", "Business context is required.");
  } else {
    const category = business["category"];
    if (!hasValue(BUSINESS_CATEGORIES_V2, category)) {
      issue(issues, "business.category", "invalid_enum", "The business category is not supported.");
    } else if (category === "other" && !isNonEmptyString(business["customCategory"])) {
      issue(
        issues,
        "business.customCategory",
        "required",
        "A custom category is required for other.",
      );
    }
  }

  const outcome = value["outcome"];
  if (!isRecord(outcome)) {
    issue(issues, "outcome", "required", "Outcome is required.");
  } else {
    const primaryGoal = outcome["primaryGoal"];
    if (!hasValue(PRIMARY_GOALS_V2, primaryGoal)) {
      issue(issues, "outcome.primaryGoal", "invalid_enum", "The primary goal is not supported.");
    } else if (primaryGoal === "other" && !isNonEmptyString(outcome["customGoal"])) {
      issue(issues, "outcome.customGoal", "required", "A custom goal is required for other.");
    }
    if (
      outcome["experienceHint"] !== undefined &&
      !hasValue(EXPERIENCE_INTENTS_V2, outcome["experienceHint"])
    ) {
      issue(
        issues,
        "outcome.experienceHint",
        "invalid_enum",
        "The experience hint is not supported.",
      );
    }
  }

  const visualDirection = value["visualDirection"];
  if (!isRecord(visualDirection)) {
    issue(issues, "visualDirection", "required", "Visual direction is required.");
  } else {
    const preference = visualDirection["preference"];
    if (!hasValue(VISUAL_DIRECTIONS_V2, preference)) {
      issue(
        issues,
        "visualDirection.preference",
        "invalid_enum",
        "The visual direction is not supported.",
      );
    } else if (preference === "other" && !isNonEmptyString(visualDirection["customDescription"])) {
      issue(
        issues,
        "visualDirection.customDescription",
        "required",
        "A custom description is required for other.",
      );
    }
  }

  const contentNeeds = value["contentNeeds"];
  if (!isRecord(contentNeeds) || !Array.isArray(contentNeeds["items"])) {
    issue(issues, "contentNeeds.items", "required", "Content needs must be an array.");
  } else {
    const seen = new Set<string>();
    contentNeeds["items"].forEach((item, index) => {
      const path = `contentNeeds.items[${index}]`;
      if (!isRecord(item) || !hasValue(CONTENT_NEEDS_V2, item["type"])) {
        issue(issues, `${path}.type`, "invalid_enum", "The content need is not supported.");
        return;
      }
      if (seen.has(item["type"]))
        issue(issues, `${path}.type`, "duplicate", "Content needs cannot be duplicated.");
      seen.add(item["type"]);
      if (item["type"] === "other" && !isNonEmptyString(item["customLabel"])) {
        issue(
          issues,
          `${path}.customLabel`,
          "required",
          "A custom label is required for other content.",
        );
      }
    });
    if (
      contentNeeds["userHasNoContentYet"] !== undefined &&
      typeof contentNeeds["userHasNoContentYet"] !== "boolean"
    ) {
      issue(
        issues,
        "contentNeeds.userHasNoContentYet",
        "invalid_type",
        "The content availability flag must be boolean.",
      );
    }
  }

  const actions = value["actions"];
  if (!isRecord(actions) || !Array.isArray(actions["secondary"])) {
    issue(issues, "actions.secondary", "required", "Secondary actions must be an array.");
  } else {
    if (actions["primary"] !== undefined)
      validateAction(actions["primary"], "actions.primary", issues);
    actions["secondary"].forEach((action, index) =>
      validateAction(action, `actions.secondary[${index}]`, issues),
    );
  }

  const media = value["media"];
  if (!isRecord(media) || !hasValue(MEDIA_PREFERENCES_V2, media["preference"])) {
    issue(issues, "media.preference", "invalid_enum", "The media preference is not supported.");
  } else {
    for (const key of [
      "hasOwnPhotos",
      "hasVideos",
      "hasLogoOrAvatar",
      "hasPortfolioOrGalleryAssets",
      "needsMediaHelp",
    ]) {
      if (media[key] !== undefined && typeof media[key] !== "boolean") {
        issue(issues, `media.${key}`, "invalid_type", "Media availability values must be boolean.");
      }
    }
  }

  const scope = value["scope"];
  if (!isRecord(scope)) {
    issue(issues, "scope", "required", "Scope is required.");
  } else {
    if (!hasValue(DENSITIES_V2, scope["density"]))
      issue(issues, "scope.density", "invalid_enum", "The density is not supported.");
    if (typeof scope["userSelected"] !== "boolean")
      issue(issues, "scope.userSelected", "invalid_type", "Scope userSelected must be boolean.");
  }

  if (value["commercial"] !== undefined) {
    const commercial = value["commercial"];
    if (!isRecord(commercial)) {
      issue(issues, "commercial", "invalid_type", "Commercial intent must be an object.");
    } else {
      if (!hasValue(COMMERCIAL_MODES_V2, commercial["mode"]))
        issue(issues, "commercial.mode", "invalid_enum", "The commercial mode is not supported.");
      if (typeof commercial["relevant"] !== "boolean")
        issue(
          issues,
          "commercial.relevant",
          "invalid_type",
          "Commercial relevance must be boolean.",
        );
    }
  }

  if (value["extensions"] !== undefined && !isRecord(value["extensions"])) {
    issue(issues, "extensions", "invalid_type", "Extensions must be a namespaced object.");
  }

  const meta = value["meta"];
  if (!isRecord(meta)) {
    issue(issues, "meta", "required", "Metadata is required.");
  } else {
    if (meta["version"] !== "2")
      issue(issues, "meta.version", "invalid_enum", "Metadata version must be 2.");
    if (
      !isNonEmptyString(meta["completedAt"]) ||
      Number.isNaN(Date.parse(meta["completedAt"] as string))
    ) {
      issue(issues, "meta.completedAt", "invalid_format", "completedAt must be a valid timestamp.");
    }
    if (meta["source"] !== "onboarding_v2")
      issue(issues, "meta.source", "invalid_enum", "Metadata source must be onboarding_v2.");
    if (meta["locale"] !== undefined && !isNonEmptyString(meta["locale"]))
      issue(issues, "meta.locale", "invalid_format", "Locale must be non-empty when present.");
  }

  return { valid: issues.length === 0, issues };
}

export function assertValidOnboardingIntentV2(value: unknown): asserts value is OnboardingIntentV2 {
  const result = validateOnboardingIntentV2(value);
  if (!result.valid) {
    throw new Error(result.issues.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
}
