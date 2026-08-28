import { describe, expect, it } from "vitest";
import { initialPageConfig } from "./editorCandidateModel";
import {
  TEMPORARY_TEMPLATE_STORAGE_KEY,
  createTemporaryTemplateFromPage,
  getRecipeTemporaryTemplates,
  parseTemporaryTemplates,
  saveTemporaryTemplate,
} from "./temporaryTemplateCatalog";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe("temporary template catalog", () => {
  it("crea una plantilla temporal editable por cada receta generada", () => {
    const templates = getRecipeTemporaryTemplates();

    expect(templates).toHaveLength(12);
    expect(new Set(templates.map((template) => template.id)).size).toBe(12);
    expect(templates.every((template) => template.source === "recipe")).toBe(true);
    expect(templates.every((template) => template.pageConfig.profile === "premium")).toBe(true);
    expect(templates.every((template) => template.pageConfig.blocks.length > 0)).toBe(true);
  });

  it("guarda copias temporales del canvas sin compartir referencia mutable", () => {
    const storage = memoryStorage();
    const createdAt = new Date("2026-08-28T12:00:00.000Z");
    const template = createTemporaryTemplateFromPage(initialPageConfig, "Prueba temporal", createdAt);

    const saved = saveTemporaryTemplate(storage, template);
    template.pageConfig.blocks = [];

    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Prueba temporal");
    expect(saved[0].createdAt).toBe("2026-08-28T12:00:00.000Z");
    expect(saved[0].pageConfig.blocks.length).toBeGreaterThan(0);
    expect(parseTemporaryTemplates(storage.values.get(TEMPORARY_TEMPLATE_STORAGE_KEY) ?? null)).toHaveLength(1);
  });
});
