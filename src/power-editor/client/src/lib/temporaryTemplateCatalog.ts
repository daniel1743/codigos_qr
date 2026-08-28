import { generatedRecipes } from "./generatedRecipeCatalog";
import { clonePageConfig, type PageConfig } from "./editorCandidateModel";

export const TEMPORARY_TEMPLATE_STORAGE_KEY = "cripqer.power-editor.temporary-templates.v1";

export type TemporaryTemplate = {
  id: string;
  name: string;
  category: string;
  archetype: string;
  source: "recipe" | "user";
  sourceRecipeId?: string;
  createdAt: string;
  pageConfig: PageConfig;
};

function isPageConfig(value: unknown): value is PageConfig {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as PageConfig).blocks) &&
      typeof (value as PageConfig).theme === "object" &&
      typeof (value as PageConfig).background === "object",
  );
}

function isTemporaryTemplate(value: unknown): value is TemporaryTemplate {
  if (!value || typeof value !== "object") return false;
  const template = value as TemporaryTemplate;
  return Boolean(template.id && template.name && isPageConfig(template.pageConfig));
}

export function getRecipeTemporaryTemplates(): TemporaryTemplate[] {
  return generatedRecipes.map((recipe) => ({
    id: `recipe-template-${recipe.id}`,
    name: recipe.name,
    category: recipe.category,
    archetype: recipe.archetype,
    source: "recipe",
    sourceRecipeId: recipe.id,
    createdAt: "generated",
    pageConfig: clonePageConfig(recipe.pageConfig),
  }));
}

export function parseTemporaryTemplates(raw: string | null): TemporaryTemplate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTemporaryTemplate).map((template) => ({
      ...template,
      source: template.source === "recipe" ? "recipe" : "user",
      pageConfig: clonePageConfig(template.pageConfig),
    }));
  } catch {
    return [];
  }
}

export function readTemporaryTemplates(storage: Pick<Storage, "getItem">): TemporaryTemplate[] {
  return parseTemporaryTemplates(storage.getItem(TEMPORARY_TEMPLATE_STORAGE_KEY));
}

export function writeTemporaryTemplates(storage: Pick<Storage, "setItem">, templates: TemporaryTemplate[]) {
  storage.setItem(TEMPORARY_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

export function createTemporaryTemplateFromPage(
  pageConfig: PageConfig,
  name: string,
  now = new Date(),
): TemporaryTemplate {
  return {
    id: `user-template-${now.getTime()}`,
    name,
    category: "custom",
    archetype: "canvas-actual",
    source: "user",
    createdAt: now.toISOString(),
    pageConfig: clonePageConfig(pageConfig),
  };
}

export function saveTemporaryTemplate(
  storage: Pick<Storage, "getItem" | "setItem">,
  template: TemporaryTemplate,
) {
  const next = [{ ...template, pageConfig: clonePageConfig(template.pageConfig) }, ...readTemporaryTemplates(storage)].slice(0, 24);
  writeTemporaryTemplates(storage, next);
  return next;
}
