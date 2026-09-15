/**
 * PAGES_7 — Page Generator input validation (pure, client-safe).
 *
 * Rejects an incomplete generation BEFORE the engine runs. It never fabricates a
 * destination, a price, an image or an item: anything the owner did not supply is
 * reported as an issue instead of being silently invented or dropped.
 */

import {
  extractInstagramHandle,
  isValidEmail,
  isValidHttpUrl,
  isValidWhatsApp,
} from "@/lib/parametric-engine-v2/destinations";
import { GENERATED_PAGE_OBJECTIVE_PRESETS } from "./objective-presets";
import {
  GENERATED_PAGE_OBJECTIVES,
  GENERATED_PAGE_STYLES,
  type GeneratedPageInput,
  type GeneratedPageItem,
  type GeneratedPageObjective,
} from "./types";

export type GeneratedPageValidationCode =
  | "required"
  | "invalid_type"
  | "invalid_enum"
  | "too_long"
  | "invalid_destination"
  | "too_many_items";

export interface GeneratedPageValidationIssue {
  path: string;
  code: GeneratedPageValidationCode;
  message: string;
}

export interface GeneratedPageValidationResult {
  valid: boolean;
  issues: GeneratedPageValidationIssue[];
}

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;
const MAX_ITEM_DESCRIPTION = 240;
const MAX_PRICE = 24;
const MAX_DATE = 40;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function push(
  issues: GeneratedPageValidationIssue[],
  path: string,
  code: GeneratedPageValidationCode,
  message: string,
): void {
  issues.push({ path, code, message });
}

function httpOnly(value: string): boolean {
  return isValidHttpUrl(value);
}

export function validateGeneratedPageItem(
  item: unknown,
  index: number,
  objective: GeneratedPageObjective,
): GeneratedPageValidationIssue[] {
  const issues: GeneratedPageValidationIssue[] = [];
  const path = `items[${index}]`;
  if (!isRecord(item)) {
    push(issues, path, "invalid_type", "Cada elemento debe ser un objeto.");
    return issues;
  }

  const title = text(item["title"]);
  if (!title) push(issues, `${path}.title`, "required", "Cada elemento necesita un nombre.");
  else if (title.length > MAX_TITLE)
    push(
      issues,
      `${path}.title`,
      "too_long",
      `El nombre no puede superar ${MAX_TITLE} caracteres.`,
    );

  const description = text(item["description"]);
  if (description.length > MAX_ITEM_DESCRIPTION)
    push(
      issues,
      `${path}.description`,
      "too_long",
      `La descripción no puede superar ${MAX_ITEM_DESCRIPTION} caracteres.`,
    );

  const price = text(item["price"]);
  if (price.length > MAX_PRICE)
    push(
      issues,
      `${path}.price`,
      "too_long",
      `El precio no puede superar ${MAX_PRICE} caracteres.`,
    );

  const date = text(item["date"]);
  if (date.length > MAX_DATE)
    push(issues, `${path}.date`, "too_long", `La fecha no puede superar ${MAX_DATE} caracteres.`);

  const imageUrl = text(item["imageUrl"]);
  if (imageUrl && !httpOnly(imageUrl))
    push(issues, `${path}.imageUrl`, "invalid_destination", "La imagen debe ser un enlace https.");

  const url = text(item["url"]);
  if (url && !httpOnly(url))
    push(issues, `${path}.url`, "invalid_destination", "El enlace debe ser una URL https.");

  const kind = GENERATED_PAGE_OBJECTIVE_PRESETS[objective].itemKind;
  if (kind === "product" && !imageUrl)
    push(
      issues,
      `${path}.imageUrl`,
      "required",
      "Para el catálogo cada producto necesita una imagen visible.",
    );
  if (kind === "project") {
    if (!imageUrl)
      push(
        issues,
        `${path}.imageUrl`,
        "required",
        "Para el portafolio cada trabajo necesita imagen.",
      );
    if (!url)
      push(issues, `${path}.url`, "required", "Para el portafolio cada trabajo necesita enlace.");
  }

  return issues;
}

export function validateGeneratedPageInput(value: unknown): GeneratedPageValidationResult {
  const issues: GeneratedPageValidationIssue[] = [];

  if (!isRecord(value)) {
    push(issues, "input", "invalid_type", "Los datos de la página no son válidos.");
    return { valid: false, issues };
  }

  const objective = value["objective"];
  if (
    typeof objective !== "string" ||
    !GENERATED_PAGE_OBJECTIVES.includes(objective as GeneratedPageObjective)
  ) {
    push(issues, "objective", "invalid_enum", "Elige qué quieres crear.");
    return { valid: false, issues };
  }
  const preset = GENERATED_PAGE_OBJECTIVE_PRESETS[objective as GeneratedPageObjective];

  const title = text(value["title"]);
  if (title.length < 2) push(issues, "title", "required", "Escribe el nombre de la página.");

  if (text(value["businessName"]).length < 2)
    push(issues, "businessName", "required", "Escribe el nombre de tu negocio.");

  if (text(value["activity"]).length < 2)
    push(issues, "activity", "required", "Cuéntanos a qué te dedicas.");

  const description = text(value["description"]);
  if (description.length > MAX_DESCRIPTION)
    push(issues, "description", "too_long", "La descripción es demasiado larga.");

  const style = value["style"];
  if (
    style !== undefined &&
    style !== null &&
    (typeof style !== "string" || !(GENERATED_PAGE_STYLES as readonly string[]).includes(style))
  ) {
    push(issues, "style", "invalid_enum", "El estilo elegido no está disponible.");
  }

  const coverImageUrl = text(value["coverImageUrl"]);
  if (coverImageUrl && !httpOnly(coverImageUrl))
    push(
      issues,
      "coverImageUrl",
      "invalid_destination",
      "La imagen de portada debe ser un enlace https.",
    );
  if (preset.requiresCover && !coverImageUrl)
    push(
      issues,
      "coverImageUrl",
      "required",
      `${preset.label} necesita una imagen de portada para mostrar tus elementos.`,
    );

  issues.push(...validateGeneratedPageAction(value["cta"]));

  const items = value["items"];
  if (items !== undefined && !Array.isArray(items)) {
    push(issues, "items", "invalid_type", "Los elementos de la página no son válidos.");
  } else if (Array.isArray(items)) {
    if (items.length > preset.maxItems)
      push(
        issues,
        "items",
        "too_many_items",
        `Puedes añadir hasta ${preset.maxItems} elementos en esta página.`,
      );
    items.slice(0, preset.maxItems).forEach((item, index) => {
      issues.push(...validateGeneratedPageItem(item, index, preset.objective));
    });
  }

  return { valid: issues.length === 0, issues };
}

function validateGeneratedPageAction(cta: unknown): GeneratedPageValidationIssue[] {
  const issues: GeneratedPageValidationIssue[] = [];
  if (cta === undefined || cta === null) return issues;
  if (!isRecord(cta)) {
    push(issues, "cta", "invalid_type", "El botón principal no es válido.");
    return issues;
  }

  const type = cta["type"];
  const ctaValue = text(cta["value"]);
  const known =
    type === "whatsapp" ||
    type === "website" ||
    type === "book" ||
    type === "follow" ||
    type === "email";
  if (!known) {
    push(issues, "cta.type", "invalid_enum", "Elige el tipo de botón principal.");
    return issues;
  }
  if (!ctaValue) {
    push(issues, "cta.value", "required", "Escribe el destino de tu botón principal.");
    return issues;
  }
  if (type === "whatsapp" && !isValidWhatsApp(ctaValue))
    push(issues, "cta.value", "invalid_destination", "Escribe un número de WhatsApp válido.");
  else if ((type === "website" || type === "book") && !httpOnly(ctaValue))
    push(issues, "cta.value", "invalid_destination", "Escribe una URL https válida.");
  else if (type === "follow" && !extractInstagramHandle(ctaValue))
    push(issues, "cta.value", "invalid_destination", "Escribe tu usuario de Instagram.");
  else if (type === "email" && !isValidEmail(ctaValue))
    push(issues, "cta.value", "invalid_destination", "Escribe un email válido.");
  return issues;
}

/** Trim + drop empty optional values so nothing fabricated reaches the engine. */
export function generatedPageItems(value: GeneratedPageInput): GeneratedPageItem[] {
  return value.items.map((item) => ({
    title: text(item.title),
    ...(text(item.description) ? { description: text(item.description) } : {}),
    ...(text(item.price) ? { price: text(item.price) } : {}),
    ...(text(item.imageUrl) ? { imageUrl: text(item.imageUrl) } : {}),
    ...(text(item.url) ? { url: text(item.url) } : {}),
    ...(text(item.date) ? { date: text(item.date) } : {}),
  }));
}
