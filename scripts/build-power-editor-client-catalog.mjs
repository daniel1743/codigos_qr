import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createTemplatePack } from "./power-editor-template-factory.mjs";

const defaultOutput = "src/power-editor/client/src/lib/generatedRecipeCatalog.ts";

export function buildClientRecipeCatalogSource(pack = createTemplatePack()) {
  const catalog = pack.templates.map(({ id, name, category, archetype, page_config }) => ({
    id,
    name,
    category,
    archetype,
    pageConfig: page_config,
  }));
  return `/* Este archivo se genera con: npm run templates:power:catalog. No editar a mano. */
import type { PageConfig } from "./editorCandidateModel";

export type GeneratedRecipe = {
  id: string;
  name: string;
  category: string;
  archetype: string;
  pageConfig: PageConfig;
};

export const GENERATED_RECIPE_CATALOG_VERSION = ${JSON.stringify(pack.generatorVersion)};
export const generatedRecipes: readonly GeneratedRecipe[] = ${JSON.stringify(catalog, null, 2)} as unknown as readonly GeneratedRecipe[];
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = resolve(process.cwd(), process.argv[2] || defaultOutput);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, buildClientRecipeCatalogSource());
  console.log(`Catálogo V6 generado: ${output}`);
}
