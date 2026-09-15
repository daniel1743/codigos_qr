/**
 * SMART_PAGES_3 — host mapping seam.
 *
 * Smart Pages owns the semantic plan. This module translates that plan into
 * the existing PAGES_7 input contract and then uses the existing Engine V2
 * entrypoint. It owns no persistence, identity, renderer or canonical schema.
 */

import type { EngineV2HostGenerationResult } from "@/lib/parametric-engine-v2/internal-entrypoint";
import { generateCripqerPageWithEngineV2 } from "@/lib/parametric-engine-v2/internal-entrypoint";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import type {
  CatalogItemV1,
  NormalizedContentV1,
  SalesActionV1,
} from "@/lib/smart-pages/catalog.types";
import type {
  PageGenerationRequest,
  PagePlanV1,
  ExperienceType,
} from "@/lib/smart-pages/smart-pages.types";
import { generatePagePlan } from "@/lib/smart-pages/page-orchestrator";
import { mapGeneratedPageToEngineInput, type GeneratedPageEngineMappingSuccess } from "./adapter";
import type { GeneratedPageActionType, GeneratedPageInput, GeneratedPageItem } from "./types";

export interface SmartPagesHostMapOptions {
  /** Required so the semantic-to-host mapping remains deterministic. */
  now: string;
}

export interface SmartPagesHostDiagnostics {
  mappedFields: string[];
  deferredFields: string[];
  unsupportedFields: string[];
  warnings: string[];
}

export interface SmartPagesHostMappingSuccess {
  ok: true;
  plan: PagePlanV1;
  generatedPageInput: GeneratedPageInput;
  adapter: GeneratedPageEngineMappingSuccess;
  diagnostics: SmartPagesHostDiagnostics;
}

export interface SmartPagesHostMappingFailure {
  ok: false;
  plan: PagePlanV1;
  errors: string[];
  diagnostics: SmartPagesHostDiagnostics;
}

export type SmartPagesHostMappingResult =
  SmartPagesHostMappingSuccess | SmartPagesHostMappingFailure;

export type SmartPagesGenerationResult =
  | { ok: true; mapping: SmartPagesHostMappingSuccess; result: EngineV2HostGenerationResult }
  | {
      ok: false;
      mapping: SmartPagesHostMappingFailure | SmartPagesHostMappingSuccess;
      errors: string[];
    };

function diagnostics(): SmartPagesHostDiagnostics {
  return { mappedFields: [], deferredFields: [], unsupportedFields: [], warnings: [] };
}

function pushOnce(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

function catalogFor(
  content: NormalizedContentV1,
  experience: ExperienceType,
): NormalizedContentV1["catalogs"][number] | undefined {
  const kind = experience === "menu" ? "menu" : experience;
  return content.catalogs.find((catalog) => catalog.kind === kind && catalog.items.length > 0);
}

function itemToGenerated(item: CatalogItemV1): GeneratedPageItem {
  const imageUrl = item.media.find((media) => media.kind === "image")?.url;
  const urlAttribute = item.attributes.find((attribute) =>
    ["url", "link", "href"].includes(attribute.key.toLowerCase()),
  )?.value;
  return {
    title: item.name,
    ...(item.description ? { description: item.description } : {}),
    ...(item.price?.label
      ? { price: item.price.label }
      : item.price?.amount !== undefined
        ? { price: `${item.price.currency ?? ""}${item.price.amount}`.trim() }
        : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(urlAttribute ? { url: urlAttribute } : {}),
  };
}

function hostObjective(experience: ExperienceType): GeneratedPageInput["objective"] | undefined {
  switch (experience) {
    case "services":
      return "services";
    case "catalog":
      return "catalog";
    case "portfolio":
      return "portfolio";
    case "menu":
      return "menu";
    default:
      return undefined;
  }
}

function actionToHost(
  action: SalesActionV1,
): { cta: { type: GeneratedPageActionType; value: string }; mapped: string } | undefined {
  if (!action.enabled || !action.target?.trim()) return undefined;
  const value = action.target.trim();
  switch (action.kind) {
    case "whatsapp":
      return { cta: { type: "whatsapp", value }, mapped: "primaryAction.whatsapp" };
    case "external_booking":
      return { cta: { type: "book", value }, mapped: "primaryAction.booking" };
    case "external_url":
      return { cta: { type: "website", value }, mapped: "primaryAction.external_url" };
    case "email":
      return { cta: { type: "email", value }, mapped: "primaryAction.email" };
    case "contact":
    case "quote":
    case "call":
    case "checkout":
      return undefined;
  }
}

function buildGeneratedInput(
  request: PageGenerationRequest,
  plan: PagePlanV1,
  result: SmartPagesHostDiagnostics,
): GeneratedPageInput | undefined {
  const objective = hostObjective(plan.experienceType);
  if (!objective) {
    pushOnce(result.unsupportedFields, `experienceType=${plan.experienceType}`);
    result.warnings.push(
      "The current host has no truthful Engine V2 objective for this semantic experience; generation is deferred.",
    );
    return undefined;
  }

  const catalog = catalogFor(request.content, plan.experienceType);
  const items = catalog?.items.filter((item) => item.enabled).map(itemToGenerated) ?? [];
  if (catalog) pushOnce(result.mappedFields, `catalog.${catalog.id}.items -> host content`);
  if (catalog?.items.some((item) => item.enabled && item.media.length > 0)) {
    pushOnce(result.mappedFields, "owner item media -> Engine V2 contentBlocks");
  }

  if (plan.experienceType === "catalog" && items.some((item) => !item.imageUrl)) {
    pushOnce(result.unsupportedFields, "catalog item without owner image");
    result.warnings.push(
      "Catalog items without a real image cannot be represented by the current host contract.",
    );
    return undefined;
  }
  if (plan.experienceType === "portfolio" && items.some((item) => !item.imageUrl || !item.url)) {
    pushOnce(result.unsupportedFields, "portfolio item without owner image or link");
    result.warnings.push(
      "Portfolio items require real owner media and a real owner link in the current host contract.",
    );
    return undefined;
  }

  const action = actionToHost(plan.ctaHierarchy.primary);
  if (action) pushOnce(result.mappedFields, action.mapped);
  else if (plan.ctaHierarchy.primary.enabled) {
    pushOnce(result.deferredFields, `primaryAction.${plan.ctaHierarchy.primary.kind}`);
    result.warnings.push(
      "The primary semantic action has no currently representable host destination.",
    );
  }

  if (request.content.gallery.length) pushOnce(result.deferredFields, "content.gallery");
  if (request.content.team.length) pushOnce(result.deferredFields, "content.team");
  if (request.content.testimonials.length) pushOnce(result.deferredFields, "content.testimonials");
  if (request.content.faq.length) pushOnce(result.deferredFields, "content.faq");
  if (request.content.contact.address) pushOnce(result.deferredFields, "content.contact.address");
  if (request.content.contact.hours) pushOnce(result.deferredFields, "content.contact.hours");
  if (request.content.contact.socials.length)
    pushOnce(result.deferredFields, "content.contact.socials");
  if (request.content.business.differentiators?.length) {
    pushOnce(result.deferredFields, "content.business.differentiators");
  }

  return {
    objective,
    title: plan.title,
    businessName: request.content.business.name,
    activity: request.businessType,
    ...(request.content.business.about ? { description: request.content.business.about } : {}),
    ...(request.content.business.cover?.url
      ? { coverImageUrl: request.content.business.cover.url }
      : {}),
    ...(action ? { cta: action.cta } : {}),
    items,
  };
}

export function mapSmartPageToEngineInput(
  request: PageGenerationRequest,
  options: SmartPagesHostMapOptions,
  suppliedPlan?: PagePlanV1,
): SmartPagesHostMappingResult {
  const plan = suppliedPlan ?? generatePagePlan(request);
  const result = diagnostics();
  const generatedInput = buildGeneratedInput(request, plan, result);
  if (!generatedInput)
    return { ok: false, plan, errors: [...result.warnings], diagnostics: result };

  const mapped = mapGeneratedPageToEngineInput(generatedInput, { now: options.now });
  if (!mapped.ok) {
    return {
      ok: false,
      plan,
      errors: mapped.errors,
      diagnostics: {
        ...result,
        unsupportedFields: [...result.unsupportedFields, ...mapped.diagnostics.unsupportedFields],
        deferredFields: [...result.deferredFields, ...mapped.diagnostics.deferredFields],
      },
    };
  }
  result.mappedFields.push(...mapped.diagnostics.mappedFields);
  result.deferredFields.push(...mapped.diagnostics.deferredFields);
  result.unsupportedFields.push(...mapped.diagnostics.unsupportedFields);
  result.warnings.push(...mapped.diagnostics.warnings);
  return {
    ok: true,
    plan,
    generatedPageInput: generatedInput,
    adapter: mapped,
    diagnostics: result,
  };
}

/** In-memory runtime smoke through the existing Engine V2 and validator. */
export function generateSmartPageWithEngineV2(
  request: PageGenerationRequest,
  options: SmartPagesHostMapOptions,
  suppliedPlan?: PagePlanV1,
): SmartPagesGenerationResult {
  const mapping = mapSmartPageToEngineInput(request, options, suppliedPlan);
  if (!mapping.ok) return { ok: false, mapping, errors: mapping.errors };
  try {
    const result = generateCripqerPageWithEngineV2(mapping.adapter.engineInput, {
      now: options.now,
      ...(mapping.adapter.contentBlocks ? { contentBlocks: mapping.adapter.contentBlocks } : {}),
      ...(mapping.adapter.engineOptions ? { engine: mapping.adapter.engineOptions } : {}),
    });
    const validation = validateTemplate(result.editorConfig);
    if (!validation.valid) {
      return {
        ok: false,
        mapping: {
          ok: false,
          plan: mapping.plan,
          errors: validation.issues.map((issue) => `${issue.path}: ${issue.message}`),
          diagnostics: mapping.diagnostics,
        },
        errors: validation.issues.map((issue) => `${issue.path}: ${issue.message}`),
      };
    }
    return { ok: true, mapping, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Engine V2 generation failed.";
    return { ok: false, mapping, errors: [message] };
  }
}
