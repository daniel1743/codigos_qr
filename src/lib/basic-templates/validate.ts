import type { BasicTemplateContent, TemplateDefinition } from "@/types/basic-templates";

/** Minimal validation helpers for the lab (no persistence yet). */

export function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function visibleLinks(content: BasicTemplateContent) {
  return content.links.filter((l) => l.enabled);
}

export function visibleCards(content: BasicTemplateContent) {
  return content.cards.filter((c) => c.enabled);
}

export interface TemplateValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateContent(
  content: BasicTemplateContent,
  template: TemplateDefinition,
): TemplateValidationResult {
  const errors: string[] = [];

  if (!content.profile.name.trim()) {
    errors.push("El nombre está vacío.");
  }

  for (const link of content.links) {
    if (link.enabled && !isValidUrl(link.url)) {
      errors.push(`El enlace "${link.label || "sin título"}" no tiene una URL válida.`);
    }
  }

  if (template.supportsCards) {
    if (content.cards.length > template.maxCards) {
      errors.push(`Máximo ${template.maxCards} cards permitidas.`);
    }
  }

  return { ok: errors.length === 0, errors };
}
