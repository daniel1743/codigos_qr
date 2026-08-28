import { LayoutTemplate, Sparkles } from "lucide-react";
import { generatedRecipes, type GeneratedRecipe } from "../lib/generatedRecipeCatalog";

const categoryLabels: Record<string, string> = {
  gold: "Oro",
  platinum: "Platino",
  obsidian: "Obsidiana",
  emerald: "Esmeralda",
  cobalt: "Cobalto",
  rose: "Rosa",
  terracotta: "Terracota",
  ivory: "Marfil",
};

export function GeneratedRecipeCatalogPanel({ onApply }: { onApply: (recipe: GeneratedRecipe) => void }) {
  return (
    <section className="ep-panel ep-generated-recipes-panel" aria-label="Catálogo local de recetas V6">
      <div className="ep-generated-recipes-intro">
        <span><Sparkles size={15} /> 12 recetas V6</span>
        <p>Catálogo local: aplicar cambia sólo este canvas. Guardar y publicar nunca se ejecutan automáticamente.</p>
      </div>
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
    </section>
  );
}
