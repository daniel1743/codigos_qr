import type { EngineV2HostGenerationInput } from "@/lib/parametric-engine-v2/internal-entrypoint";
import {
  extractInstagramHandle,
  isValidEmail,
  isValidHttpUrl,
  isValidWhatsApp,
} from "@/lib/parametric-engine-v2/destinations";
import { normalizeBusinessCategory } from "@/lib/parametric-engine-v2/normalize";
import type { ActionIntentV2, ActionTypeV2, ContentNeedV2, OnboardingIntentV2 } from "./types";
import { validateOnboardingIntentV2 } from "./validation";

export interface OnboardingV2AdapterDiagnostics {
  mappedFields: string[];
  inferredFields: string[];
  deferredFields: string[];
  unsupportedFields: string[];
  warnings: string[];
}

export type OnboardingV2AdapterFailureCode =
  "INVALID_INPUT" | "INVALID_DESTINATION" | "NEEDS_INPUT" | "UNSUPPORTED_SEMANTICS";

export interface OnboardingV2AdapterSuccess {
  ok: true;
  engineInput: EngineV2HostGenerationInput;
  diagnostics: OnboardingV2AdapterDiagnostics;
}

export interface OnboardingV2AdapterFailure {
  ok: false;
  code: OnboardingV2AdapterFailureCode;
  errors: string[];
  diagnostics: OnboardingV2AdapterDiagnostics;
}

export type OnboardingV2AdapterResult = OnboardingV2AdapterSuccess | OnboardingV2AdapterFailure;

const GOAL_MAP: Record<OnboardingIntentV2["outcome"]["primaryGoal"], string> = {
  presence: "leads",
  contacts: "leads",
  whatsapp: "whatsapp",
  bookings: "booking",
  show_services: "leads",
  show_portfolio: "portfolio",
  sell: "sell",
  quote_requests: "leads",
  social_growth: "social",
  other: "leads",
};

const STYLE_MAP: Partial<Record<OnboardingIntentV2["visualDirection"]["preference"], string>> = {
  elegant: "elegant",
  minimal: "minimal",
  modern: "modern",
  professional: "professional",
  energetic: "energetic",
  premium: "premium",
};

const CONTENT_FEATURE_MAP: Partial<Record<ContentNeedV2, string>> = {
  links: "links",
  services: "services",
  products: "products",
  portfolio: "portfolio",
  gallery: "gallery",
  video: "video",
  team: "team",
  testimonials: "testimonials",
  booking: "booking",
  contact: "contact",
  social_networks: "social",
  pricing: "pricing",
  location: "location",
  faq: "faq",
};

const unique = (items: string[]): string[] => [...new Set(items)];

function diagnostics(): OnboardingV2AdapterDiagnostics {
  return {
    mappedFields: [],
    inferredFields: [],
    deferredFields: [],
    unsupportedFields: [],
    warnings: [],
  };
}

function pushOnce(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

function durableAssetRef(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return trimmed.startsWith("https://") || (trimmed.startsWith("/") && !trimmed.startsWith("//"));
}

function mapGoal(intent: OnboardingIntentV2, result: OnboardingV2AdapterDiagnostics): string {
  const goal = intent.outcome.primaryGoal;
  const mapped = GOAL_MAP[goal];
  pushOnce(result.mappedFields, `outcome.primaryGoal -> goal=${mapped}`);
  if (
    goal === "presence" ||
    goal === "contacts" ||
    goal === "show_services" ||
    goal === "quote_requests"
  ) {
    pushOnce(result.inferredFields, `outcome.primaryGoal=${goal} -> Engine V2 goal=${mapped}`);
  }
  if (goal === "other") {
    pushOnce(result.deferredFields, "outcome.customGoal");
    result.warnings.push(
      "The current Engine V2 goal vocabulary has no custom goal field; using the safe leads fallback.",
    );
  }
  return mapped;
}

function mapPrimaryAction(
  action: ActionIntentV2 | undefined,
  result: OnboardingV2AdapterDiagnostics,
):
  | { type: "whatsapp" | "booking" | "website" | "instagram" | "email"; value: string }
  | OnboardingV2AdapterFailureCode {
  if (!action) return "NEEDS_INPUT";
  const value = action.value?.trim() ?? "";
  if (action.label) pushOnce(result.deferredFields, "actions.primary.label");
  switch (action.type) {
    case "whatsapp":
      if (!value || !isValidWhatsApp(value)) return "INVALID_DESTINATION";
      return { type: "whatsapp", value };
    case "book":
      if (!value || !isValidHttpUrl(value)) return "NEEDS_INPUT";
      return { type: "booking", value };
    case "website":
      if (!value || !isValidHttpUrl(value)) return "INVALID_DESTINATION";
      return { type: "website", value };
    case "follow":
      if (!value || !extractInstagramHandle(value)) return "INVALID_DESTINATION";
      return { type: "instagram", value };
    case "email":
      if (!value || !isValidEmail(value)) return "INVALID_DESTINATION";
      return { type: "email", value };
    case "call":
    case "buy":
    case "request_quote":
    case "menu":
    case "contact":
    case "other":
      return "UNSUPPORTED_SEMANTICS";
  }
}

function mapSecondaryActions(
  actions: ActionIntentV2[],
  result: OnboardingV2AdapterDiagnostics,
): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];
  if (actions.length) {
    pushOnce(result.deferredFields, "actions.secondary.priority");
    pushOnce(
      result.warnings,
      "The current host has no secondary-action field; representable secondary destinations are preserved as ordered content links.",
    );
  }
  actions.forEach((action, index) => {
    const value = action.value?.trim() ?? "";
    if (value && isValidHttpUrl(value)) {
      links.push({ label: action.label?.trim() || action.type, url: value });
      pushOnce(
        result.mappedFields,
        `actions.secondary[${index}] -> content.links[${links.length - 1}]`,
      );
    } else {
      pushOnce(result.unsupportedFields, `actions.secondary[${index}].${action.type}`);
      pushOnce(result.deferredFields, `actions.secondary[${index}]`);
      result.warnings.push(
        `Secondary action ${index + 1} has no host-compatible HTTPS destination and was preserved only in diagnostics.`,
      );
    }
  });
  return links;
}

export function mapOnboardingIntentV2ToEngineInput(
  intent: OnboardingIntentV2,
): OnboardingV2AdapterResult {
  const result = diagnostics();
  const validation = validateOnboardingIntentV2(intent);
  if (!validation.valid) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      errors: validation.issues.map((item) => `${item.path || "intent"}: ${item.message}`),
      diagnostics: result,
    };
  }

  if (intent.commercial) {
    pushOnce(result.deferredFields, "commercial");
    result.warnings.push(
      "Commercial intent is diagnostic only in this phase; no catalog, checkout or payment behavior is created.",
    );
  }

  const primaryAction = mapPrimaryAction(intent.actions.primary, result);
  if (typeof primaryAction === "string") {
    const message =
      primaryAction === "NEEDS_INPUT"
        ? "The current Engine V2 requires a primary action with a valid destination."
        : primaryAction === "INVALID_DESTINATION"
          ? "The primary action destination is invalid for the current Engine V2 host."
          : "The current Engine V2 host cannot represent this primary action type without changing Engine business logic.";
    if (primaryAction === "UNSUPPORTED_SEMANTICS")
      pushOnce(result.unsupportedFields, "actions.primary");
    if (primaryAction === "NEEDS_INPUT") pushOnce(result.deferredFields, "actions.primary");
    return { ok: false, code: primaryAction, errors: [message], diagnostics: result };
  }

  // The frozen host derives business_type from profession and does not expose
  // business_other. A specific activity unknown to its V1 taxonomy would be
  // rejected by Engine V2, so never silently replace it with a generic label.
  if (normalizeBusinessCategory(intent.identity.professionOrActivity) === "other") {
    pushOnce(result.unsupportedFields, "identity.professionOrActivity -> EngineV2 business_type");
    pushOnce(result.deferredFields, "business.category/customCategory");
    result.warnings.push(
      "The frozen Engine V2 host requires business_other for specific activities outside its V1 taxonomy, but EngineV2HostGenerationInput does not expose that field.",
    );
    return {
      ok: false,
      code: "UNSUPPORTED_SEMANTICS",
      errors: [
        "Engine V2 cannot receive this specific activity without business_other; preserving it requires a host-contract or Engine change outside Phase 3.",
      ],
      diagnostics: result,
    };
  }

  const selectedFeatures: string[] = [];
  for (const item of intent.contentNeeds.items) {
    const mapped = CONTENT_FEATURE_MAP[item.type];
    if (mapped) {
      selectedFeatures.push(mapped);
      pushOnce(result.mappedFields, `contentNeeds.${item.type} -> selectedFeatures=${mapped}`);
      if (
        item.type === "team" ||
        item.type === "testimonials" ||
        item.type === "pricing" ||
        item.type === "location" ||
        item.type === "faq"
      ) {
        pushOnce(result.deferredFields, `contentNeeds.${item.type}`);
      }
    } else {
      pushOnce(result.unsupportedFields, `contentNeeds.${item.type}`);
      pushOnce(result.deferredFields, `contentNeeds.${item.type}`);
      result.warnings.push(
        "The current Engine V2 has no direct feature token for contentNeeds.other; the semantic request remains in diagnostics.",
      );
    }
    if (item.customLabel) pushOnce(result.deferredFields, `contentNeeds.${item.type}.customLabel`);
  }

  if (intent.contentNeeds.userHasNoContentYet)
    pushOnce(result.inferredFields, "contentNeeds.userHasNoContentYet");
  if (intent.visualDirection.preference === "let_cripqer_decide") {
    pushOnce(result.inferredFields, "visualDirection.preference -> Engine V2 default style");
  } else if (intent.visualDirection.preference === "other") {
    pushOnce(result.deferredFields, "visualDirection.customDescription");
    result.warnings.push(
      "The current Engine V2 has no custom visual-direction field; its default style is retained.",
    );
  }

  const secondaryLinks = mapSecondaryActions(intent.actions.secondary, result);
  if (intent.scope.density === "auto")
    pushOnce(result.inferredFields, "scope.density=auto -> Engine V2 defaults");
  else pushOnce(result.deferredFields, `scope.density=${intent.scope.density}`);
  if (intent.outcome.experienceHint) pushOnce(result.deferredFields, "outcome.experienceHint");
  if (intent.extensions) pushOnce(result.deferredFields, "extensions");

  const avatarUrl = durableAssetRef(intent.identity.avatarAssetRef)
    ? intent.identity.avatarAssetRef?.trim()
    : undefined;
  const bannerUrl = durableAssetRef(intent.identity.bannerAssetRef)
    ? intent.identity.bannerAssetRef?.trim()
    : undefined;
  if (intent.identity.avatarAssetRef && !avatarUrl) {
    pushOnce(result.deferredFields, "identity.avatarAssetRef");
    result.warnings.push("A non-durable avatar reference was not passed to Engine V2.");
  }
  if (intent.identity.bannerAssetRef && !bannerUrl) {
    pushOnce(result.deferredFields, "identity.bannerAssetRef");
    result.warnings.push("A non-durable banner reference was not passed to Engine V2.");
  }

  const input: EngineV2HostGenerationInput = {
    profession: intent.identity.professionOrActivity.trim(),
    goal: mapGoal(intent, result),
    ...(STYLE_MAP[intent.visualDirection.preference]
      ? { style: STYLE_MAP[intent.visualDirection.preference] }
      : {}),
    selectedFeatures: unique(selectedFeatures),
    content: {
      name: intent.identity.displayName.trim(),
      ...(intent.identity.bio?.trim() ? { bio: intent.identity.bio.trim() } : {}),
      ...(secondaryLinks.length ? { links: secondaryLinks } : {}),
    },
    primaryAction,
    ...(avatarUrl || bannerUrl
      ? { userMedia: { ...(avatarUrl ? { avatarUrl } : {}), ...(bannerUrl ? { bannerUrl } : {}) } }
      : {}),
  };
  pushOnce(result.mappedFields, "identity.displayName -> content.name");
  pushOnce(result.mappedFields, "identity.professionOrActivity -> profession");
  if (intent.identity.bio) pushOnce(result.mappedFields, "identity.bio -> content.bio");
  pushOnce(result.mappedFields, "actions.primary -> primaryAction");
  return { ok: true, engineInput: input, diagnostics: result };
}
