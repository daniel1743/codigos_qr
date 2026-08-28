import { LayoutTemplate, Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PageConfig } from "../lib/editorCandidateModel";
import { generatedRecipes, type GeneratedRecipe } from "../lib/generatedRecipeCatalog";
import {
  createTemporaryTemplateFromPage,
  getRecipeTemporaryTemplates,
  readTemporaryTemplates,
  saveTemporaryTemplate,
  type TemporaryTemplate,
} from "../lib/temporaryTemplateCatalog";

const categoryLabels: Record<string, string> = {
  gold: "Oro",
  platinum: "Platino",
  obsidian: "Obsidiana",
  emerald: "Esmeralda",
  cobalt: "Cobalto",
  rose: "Rosa",
  terracotta: "Terracota",
  ivory: "Marfil",
  custom: "Personal",
};

function templateToRecipe(template: TemporaryTemplate): GeneratedRecipe {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    archetype: template.archetype,
    pageConfig: template.pageConfig,
  };
}

export function GeneratedRecipeCatalogPanel({
  currentPage,
  focus = "recipes",
  onApply,
}: {
  currentPage: PageConfig;
  focus?: "recipes" | "templates";
  onApply: (recipe: GeneratedRecipe) => void;
}) {
  const recipeTemplates = useMemo(() => getRecipeTemporaryTemplates(), []);
  const [savedTemplates, setSavedTemplates] = useState<TemporaryTemplate[]>(() =>
    typeof window === "undefined" ? [] : readTemporaryTemplates(window.localStorage),
  );
  const allTemplates = [...recipeTemplates, ...savedTemplates];

  const saveCurrentTemplate = () => {
    if (typeof window === "undefined") return;
    const template = createTemporaryTemplateFromPage(
      currentPage,
      `Template temporal ${savedTemplates.length + 1}`,
    );
    setSavedTemplates(saveTemporaryTemplate(window.localStorage, template));
    toast.success("Canvas guardado temporalmente en Templates.");
  };

  const recipesSection = (
    <div className="ep-generated-section">
      <h3>Recetas</h3>
      <div className="ep-generated-recipes-grid">
        {generatedRecipes.map((recipe) => (
          <article className="ep-generated-recipe-card" key={recipe.id}>
            <div className={`ep-generated-recipe-swatch is-${recipe.category}`} />
            <div>
              <strong>{recipe.name}</strong>
              <small>{categoryLabels[recipe.category] ?? recipe.category} · {recipe.archetype.replace(/-/g, " ")}</small>
            </div>
            <button type="button" onClick={() => onApply(recipe)}>
              <LayoutTemplate size={14} /> Aplicar al canvas
            </button>
          </article>
        ))}
      </div>
    </div>
  );

  const templatesSection = (
    <div className="ep-generated-section ep-temporary-templates-section">
      <div className="ep-generated-section-head">
        <h3>Templates</h3>
        <button type="button" onClick={saveCurrentTemplate}>
          <Save size={14} /> Guardar actual
        </button>
      </div>
      <p className="ep-generated-template-note">
        Zona temporal de prueba: 12 templates creados desde las recetas. Al elegir uno se carga como canvas editable.
      </p>
      <div className="ep-generated-recipes-grid">
        {allTemplates.map((template) => (
          <article className="ep-generated-recipe-card ep-template-card" key={template.id}>
            <div className={`ep-generated-recipe-swatch is-${template.category}`} />
            <div>
              <strong>{template.name}</strong>
              <small>
                {template.source === "recipe" ? "Receta" : "Guardado"} · {categoryLabels[template.category] ?? template.category}
              </small>
            </div>
            <button type="button" onClick={() => onApply(templateToRecipe(template))}>
              <LayoutTemplate size={14} /> Editar template
            </button>
          </article>
        ))}
      </div>
    </div>
  );

  return (
    <section className="ep-panel ep-generated-recipes-panel" aria-label="Catálogo local de recetas V6 y templates temporales">
      <div className="ep-generated-recipes-intro">
        <span><Sparkles size={15} /> 12 recetas V6</span>
        <p>Catálogo local: aplicar o editar cambia sólo este canvas. Guardar y publicar nunca se ejecutan automáticamente.</p>
      </div>
      {focus === "templates" ? <>{templatesSection}{recipesSection}</> : <>{recipesSection}{templatesSection}</>}
    </section>
  );
}
