/**
 * ONBOARDING V2 → Smart Pages host adapter.
 *
 * This is the only bridge from onboarding semantics to the existing
 * `PageGenerationRequest`. It owns no persistence, renderer, canonical
 * document or generation engine. Owner facts come from `OwnerContentInput`;
 * onboarding intent supplies goals, activity and action intent.
 */

import {
  getOwnerContentReadiness,
  ownerContentToPageGenerationRequest,
  validateOwnerContentInput,
  type OwnerContentInput,
} from "@/lib/page-generator/owner-content";
import {
  generateSmartPageWithEngineV2,
  type SmartPagesGenerationResult,
  type SmartPagesHostMappingResult,
} from "@/lib/page-generator/smart-pages-host-map";
import type { SalesActionV1, SalesMode } from "@/lib/smart-pages/catalog.types";
import { generatePagePlan } from "@/lib/smart-pages/page-orchestrator";
import type {
  Density,
  ExperienceType,
  PageGenerationRequest,
  PageGoal,
  PagePlanV1,
} from "@/lib/smart-pages/smart-pages.types";
import { validateOnboardingIntentV2, type OnboardingV2ValidationIssue } from "./validation";
import type { ActionIntentV2, OnboardingIntentV2 } from "./types";
import type { CuratedMediaResult } from "@/lib/parametric-engine-v2/media";

export interface OnboardingSmartPagesAdapterDiagnostics {
  mappedFields: string[];
  deferredFields: string[];
  unsupportedFields: string[];
  missingOwnerFacts: string[];
  warnings: string[];
}

export type OnboardingSmartPagesAdapterFailureCode =
  "INVALID_INPUT" | "NEEDS_INPUT" | "UNSUPPORTED_SEMANTICS";

export interface OnboardingSmartPagesAdapterOptions {
  ownerContent?: OwnerContentInput;
  experienceType?: ExperienceType;
  variant?: number;
  maxPages?: number;
  curatedMedia?: CuratedMediaResult;
}

export interface OnboardingSmartPagesAdapterSuccess {
  ok: true;
  request: PageGenerationRequest;
  ownerContent: OwnerContentInput;
  diagnostics: OnboardingSmartPagesAdapterDiagnostics;
}

export interface OnboardingSmartPagesAdapterFailure {
  ok: false;
  code: OnboardingSmartPagesAdapterFailureCode;
  errors: string[];
  diagnostics: OnboardingSmartPagesAdapterDiagnostics;
}

export type OnboardingSmartPagesAdapterResult =
  OnboardingSmartPagesAdapterSuccess | OnboardingSmartPagesAdapterFailure;

export interface OnboardingSmartPagesGenerationSuccess {
  ok: true;
  request: PageGenerationRequest;
  plan: PagePlanV1;
  mapping: SmartPagesHostMappingResult;
  result: Extract<SmartPagesGenerationResult, { ok: true }>["result"];
  diagnostics: OnboardingSmartPagesAdapterDiagnostics;
}

export interface OnboardingSmartPagesGenerationFailure {
  ok: false;
  code?: OnboardingSmartPagesAdapterFailureCode;
  errors: string[];
  diagnostics: OnboardingSmartPagesAdapterDiagnostics;
  mapping?: SmartPagesHostMappingResult;
}

export type OnboardingSmartPagesGenerationResult =
  OnboardingSmartPagesGenerationSuccess | OnboardingSmartPagesGenerationFailure;

function diagnostics(): OnboardingSmartPagesAdapterDiagnostics {
  return {
    mappedFields: [],
    deferredFields: [],
    unsupportedFields: [],
    missingOwnerFacts: [],
    warnings: [],
  };
}

function pushOnce(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

function densityFor(intent: OnboardingIntentV2): Density {
  switch (intent.scope.density) {
    case "simple":
      return "minimal";
    case "complete":
      return "rich";
    case "auto":
      return "balanced";
  }
}

function goalFor(intent: OnboardingIntentV2): PageGoal {
  switch (intent.outcome.primaryGoal) {
    case "sell":
      return "sell";
    case "bookings":
      return "book";
    case "quote_requests":
      return "quote";
    case "show_portfolio":
      return "showcase";
    case "presence":
    case "contacts":
    case "whatsapp":
    case "show_services":
    case "social_growth":
    case "other":
      return intent.outcome.primaryGoal === "contacts" || intent.outcome.primaryGoal === "whatsapp"
        ? "contact"
        : "inform";
  }
}

function salesModeFor(intent: OnboardingIntentV2): SalesMode {
  const commercial = intent.commercial?.mode;
  if (commercial === "booking") return "booking";
  if (commercial === "quote") return "quote";
  if (commercial === "contact") return "contact";
  if (commercial === "display_only") return "info";
  switch (intent.outcome.primaryGoal) {
    case "bookings":
      return "booking";
    case "quote_requests":
      return "quote";
    case "contacts":
    case "whatsapp":
      return "contact";
    default:
      return "info";
  }
}

function experienceFor(
  intent: OnboardingIntentV2,
  ownerContent: OwnerContentInput,
  requested: ExperienceType | undefined,
): ExperienceType {
  if (requested) return requested;
  if (intent.outcome.primaryGoal === "show_portfolio" && ownerContent.portfolioItems?.length)
    return "portfolio";
  if (intent.outcome.primaryGoal === "sell" && ownerContent.products?.length) return "catalog";
  if (ownerContent.menuItems?.length) return "menu";
  if (ownerContent.services?.length) return "services";
  switch (intent.outcome.experienceHint) {
    case "catalog":
      return "catalog";
    case "service_page":
      return "services";
    case "professional_landing":
    case "personal_page":
    case "other":
      return "landing";
    case "smart_mini_site":
      return "landing";
    case "whatsapp_commerce":
    case "ecommerce":
      return ownerContent.products?.length ? "catalog" : "landing";
    default:
      return "landing";
  }
}

function durableMedia(ref: string | undefined): { url: string; kind: "image" } | undefined {
  const url = ref?.trim();
  if (!url || !(url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//")))) {
    return undefined;
  }
  return { url, kind: "image" };
}

function mergeOnboardingIdentity(
  intent: OnboardingIntentV2,
  ownerContent: OwnerContentInput,
): OwnerContentInput {
  const identity = {
    ...(ownerContent.identity ?? {}),
    ...(ownerContent.identity?.businessName?.trim()
      ? {}
      : { businessName: intent.identity.displayName.trim() }),
    ...(ownerContent.identity?.shortDescription?.trim() || !intent.identity.bio?.trim()
      ? {}
      : { shortDescription: intent.identity.bio.trim() }),
  };
  const media = { ...(ownerContent.media ?? {}) };
  if (!media.avatar) {
    const avatar = durableMedia(intent.identity.avatarAssetRef);
    if (avatar) media.avatar = avatar;
  }
  if (!media.cover) {
    const cover = durableMedia(intent.identity.bannerAssetRef);
    if (cover) media.cover = cover;
  }
  return {
    ...ownerContent,
    identity,
    ...(Object.keys(media).length ? { media } : {}),
  };
}

function targetFromOwnerFacts(
  action: ActionIntentV2,
  ownerContent: OwnerContentInput,
): { target?: string; source?: string } {
  if (action.value?.trim()) return { target: action.value.trim() };
  const contact = ownerContent.contact;
  switch (action.type) {
    case "whatsapp":
      return contact?.whatsapp?.trim()
        ? { target: contact.whatsapp.trim(), source: "ownerContent.contact.whatsapp" }
        : {};
    case "call":
      return contact?.phone?.trim()
        ? { target: contact.phone.trim(), source: "ownerContent.contact.phone" }
        : {};
    case "email":
      return contact?.email?.trim()
        ? { target: contact.email.trim(), source: "ownerContent.contact.email" }
        : {};
    case "book":
      return contact?.bookingUrl?.trim()
        ? { target: contact.bookingUrl.trim(), source: "ownerContent.contact.bookingUrl" }
        : {};
    case "request_quote":
    case "contact":
      if (contact?.whatsapp?.trim())
        return { target: contact.whatsapp.trim(), source: "ownerContent.contact.whatsapp" };
      if (contact?.email?.trim())
        return { target: contact.email.trim(), source: "ownerContent.contact.email" };
      if (contact?.phone?.trim())
        return { target: contact.phone.trim(), source: "ownerContent.contact.phone" };
      return {};
    default:
      return {};
  }
}

function salesActionFor(
  action: ActionIntentV2 | undefined | null,
  ownerContent: OwnerContentInput,
  result: OnboardingSmartPagesAdapterDiagnostics,
): SalesActionV1 | undefined {
  if (!action) return undefined;
  const resolved = targetFromOwnerFacts(action, ownerContent);
  if (resolved.source) pushOnce(result.mappedFields, `actions.primary <- ${resolved.source}`);
  const label = action.label?.trim() || action.type;
  const target = resolved.target;
  switch (action.type) {
    case "whatsapp":
      return { kind: "whatsapp", label, ...(target ? { target } : {}), enabled: Boolean(target) };
    case "call":
      return { kind: "call", label, ...(target ? { target } : {}), enabled: Boolean(target) };
    case "email":
      return { kind: "email", label, ...(target ? { target } : {}), enabled: Boolean(target) };
    case "book":
      return {
        kind: "external_booking",
        label,
        ...(target ? { target } : {}),
        enabled: Boolean(target),
      };
    case "request_quote":
      return { kind: "quote", label, ...(target ? { target } : {}), enabled: Boolean(target) };
    case "contact":
      return { kind: "contact", label, ...(target ? { target } : {}), enabled: Boolean(target) };
    case "website":
    case "buy":
    case "menu":
      if (!target) {
        pushOnce(result.deferredFields, `actions.primary.${action.type}`);
        return { kind: "external_url", label, enabled: false };
      }
      return { kind: "external_url", label, target, enabled: true };
    case "follow":
      pushOnce(result.unsupportedFields, "actions.primary.follow");
      pushOnce(result.deferredFields, "actions.primary.follow");
      return { kind: "external_url", label, enabled: false };
    case "other":
      pushOnce(result.unsupportedFields, "actions.primary.other");
      return { kind: "contact", label, enabled: false };
  }
}

function secondaryActionsFor(
  actions: ActionIntentV2[],
  ownerContent: OwnerContentInput,
  result: OnboardingSmartPagesAdapterDiagnostics,
): SalesActionV1[] {
  return actions.flatMap((action, index) => {
    const resolved = targetFromOwnerFacts(action, ownerContent);
    const target = resolved.target;
    if (!target) {
      pushOnce(result.deferredFields, `actions.secondary[${index}]`);
      return [];
    }
    const mapped = salesActionFor(action, ownerContent, result);
    return mapped ? [mapped] : [];
  });
}

function primaryActionFor(
  intent: OnboardingIntentV2,
  ownerContent: OwnerContentInput,
  result: OnboardingSmartPagesAdapterDiagnostics,
): SalesActionV1 {
  const mapped = salesActionFor(intent.actions.primary, ownerContent, result);
  if (mapped) return mapped;
  pushOnce(result.mappedFields, "actions.primary -> disabled contact fallback");
  return { kind: "contact", label: "Contact", enabled: false };
}

function hydrateActionValue(
  intent: OnboardingIntentV2,
  ownerContent: OwnerContentInput,
  result: OnboardingSmartPagesAdapterDiagnostics,
): { intent: OnboardingIntentV2; missingAction?: ActionIntentV2 } {
  const primary = intent.actions.primary;
  if (!primary || primary.value?.trim()) return { intent };
  const resolved = targetFromOwnerFacts(primary, ownerContent);
  if (!resolved.target) return { intent, missingAction: primary };
  pushOnce(result.mappedFields, `actions.primary.${primary.type} <- owner destination`);
  return {
    intent: {
      ...intent,
      actions: { ...intent.actions, primary: { ...primary, value: resolved.target } },
    },
  };
}

function hostRequiredFacts(
  ownerContent: OwnerContentInput,
  experience: ExperienceType,
  result: OnboardingSmartPagesAdapterDiagnostics,
): void {
  if (experience === "catalog") {
    ownerContent.products?.forEach((item, index) => {
      if (!item.media?.some((media) => media.kind === "image")) {
        pushOnce(result.missingOwnerFacts, `products[${index}].media`);
      }
    });
  }
  if (experience === "portfolio") {
    ownerContent.portfolioItems?.forEach((item, index) => {
      if (!item.media?.some((media) => media.kind === "image"))
        pushOnce(result.missingOwnerFacts, `portfolioItems[${index}].media`);
      if (!item.destination?.trim())
        pushOnce(result.missingOwnerFacts, `portfolioItems[${index}].destination`);
    });
    if (!ownerContent.media?.cover) pushOnce(result.missingOwnerFacts, "media.cover");
  }
}

function bridgeOwnerDestinations(request: PageGenerationRequest): PageGenerationRequest {
  return {
    ...request,
    content: {
      ...request.content,
      catalogs: request.content.catalogs.map((catalog) => ({
        ...catalog,
        items: catalog.items.map((item) => {
          const target = item.action?.target;
          if (!target || item.attributes.some((attribute) => attribute.key === "url")) return item;
          return {
            ...item,
            attributes: [
              ...item.attributes,
              { key: "url", label: "Owner destination", value: target },
            ],
          };
        }),
      })),
    },
  };
}

function validationErrors(issues: OnboardingV2ValidationIssue[]): string[] {
  return issues.map((item) => `${item.path || "intent"}: ${item.message}`);
}

/** Maps onboarding intent plus owner facts to the one existing Smart Pages request. */
export function mapOnboardingIntentV2ToSmartPagesRequest(
  intent: OnboardingIntentV2,
  options: OnboardingSmartPagesAdapterOptions = {},
): OnboardingSmartPagesAdapterResult {
  const result = diagnostics();
  const ownerContent = options.ownerContent ?? intent.ownerContent ?? {};
  const ownerValidation = validateOwnerContentInput(ownerContent);
  if (!ownerValidation.valid) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      errors: ownerValidation.issues.map((issue) => `ownerContent.${issue.path}: ${issue.message}`),
      diagnostics: result,
    };
  }

  const hydrated = hydrateActionValue(intent, ownerContent, result);
  if (hydrated.missingAction) {
    pushOnce(
      result.missingOwnerFacts,
      `actions.primary.${hydrated.missingAction.type}.destination`,
    );
    result.warnings.push(
      "The selected primary action has no real destination in intent or owner content.",
    );
    return {
      ok: false,
      code: "NEEDS_INPUT",
      errors: [`Missing destination for primary action '${hydrated.missingAction.type}'.`],
      diagnostics: result,
    };
  }

  const intentValidation = validateOnboardingIntentV2(hydrated.intent);
  if (!intentValidation.valid) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      errors: validationErrors(intentValidation.issues),
      diagnostics: result,
    };
  }

  const mergedOwnerContent = mergeOnboardingIdentity(hydrated.intent, ownerContent);
  const experienceType = experienceFor(hydrated.intent, mergedOwnerContent, options.experienceType);
  const readiness = getOwnerContentReadinessForAdapter(mergedOwnerContent, experienceType);
  result.missingOwnerFacts.push(...readiness.missingOwnerFacts);
  result.warnings.push(...readiness.warnings);
  hostRequiredFacts(mergedOwnerContent, experienceType, result);
  if (result.missingOwnerFacts.length) {
    return {
      ok: false,
      code: "NEEDS_INPUT",
      errors: result.missingOwnerFacts.map((field) => `Missing owner fact: ${field}.`),
      diagnostics: result,
    };
  }

  const primaryAction = primaryActionFor(hydrated.intent, mergedOwnerContent, result);
  const secondaryActions = secondaryActionsFor(
    hydrated.intent.actions.secondary,
    mergedOwnerContent,
    result,
  );
  const request = bridgeOwnerDestinations(
    ownerContentToPageGenerationRequest(mergedOwnerContent, {
      businessType: hydrated.intent.identity.professionOrActivity,
      businessCategory: hydrated.intent.business.category,
      goal: goalFor(hydrated.intent),
      density: densityFor(hydrated.intent),
      salesMode: salesModeFor(hydrated.intent),
      primaryAction,
      secondaryActions,
      experienceType,
      ...(options.variant !== undefined ? { variant: options.variant } : {}),
      ...(options.maxPages !== undefined ? { maxPages: options.maxPages } : {}),
    }),
  );

  pushOnce(result.mappedFields, "identity.professionOrActivity -> businessType");
  pushOnce(result.mappedFields, `outcome.primaryGoal -> goal=${request.goal}`);
  pushOnce(result.mappedFields, `scope.density -> density=${request.density}`);
  pushOnce(result.mappedFields, "ownerContent -> NormalizedContentV1");
  if (request.primaryAction.enabled)
    pushOnce(result.mappedFields, "actions.primary -> SalesActionV1");
  if (mergedOwnerContent.media?.avatar || mergedOwnerContent.media?.cover)
    pushOnce(result.mappedFields, "ownerContent.media -> NormalizedContentV1.business media");

  pushOnce(result.deferredFields, "visualDirection");
  pushOnce(result.deferredFields, "contentNeeds");
  if (hydrated.intent.media.preference !== "no_preference")
    pushOnce(result.deferredFields, "media.preference");
  if (hydrated.intent.scope.userSelected) pushOnce(result.deferredFields, "scope.userSelected");
  if (hydrated.intent.commercial?.mode === "sell") {
    pushOnce(result.deferredFields, "commercial.mode=sell");
    result.warnings.push(
      "Checkout semantics remain deferred; no transactional behavior was created.",
    );
  }
  if (hydrated.intent.outcome.customGoal) pushOnce(result.deferredFields, "outcome.customGoal");
  if (hydrated.intent.business.customCategory)
    pushOnce(result.deferredFields, "business.customCategory");

  return { ok: true, request, ownerContent: mergedOwnerContent, diagnostics: result };
}

function getOwnerContentReadinessForAdapter(
  ownerContent: OwnerContentInput,
  experience: ExperienceType,
): { missingOwnerFacts: string[]; warnings: string[] } {
  const readiness = getOwnerContentReadiness(ownerContent, experience);
  return {
    missingOwnerFacts: readiness.issues.map((issue) => issue.path),
    warnings: readiness.issues.map((issue) => issue.message),
  };
}

/**
 * In-memory generation seam. It runs the existing Smart Pages orchestrator,
 * host mapper, Engine V2 entrypoint and canonical validator; it never writes.
 */
export function generateSmartPageFromOnboarding(
  intent: OnboardingIntentV2,
  options: OnboardingSmartPagesAdapterOptions & { now: string },
): OnboardingSmartPagesGenerationResult {
  const mapped = mapOnboardingIntentV2ToSmartPagesRequest(intent, options);
  if (!mapped.ok)
    return { ok: false, code: mapped.code, errors: mapped.errors, diagnostics: mapped.diagnostics };
  const plan = generatePagePlan(mapped.request);
  const generation = generateSmartPageWithEngineV2(mapped.request, {
    now: options.now,
    ...(options.curatedMedia ? { curatedMedia: options.curatedMedia } : {}),
  }, plan);
  if (!generation.ok) {
    return {
      ok: false,
      errors: generation.errors,
      diagnostics: mapped.diagnostics,
      mapping: generation.mapping,
    };
  }
  return {
    ok: true,
    request: mapped.request,
    plan,
    mapping: generation.mapping,
    result: generation.result,
    diagnostics: mapped.diagnostics,
  };
}

export const onboardingSmartPagesAdapter = {
  mapOnboardingIntentV2ToSmartPagesRequest,
  generateSmartPageFromOnboarding,
};
