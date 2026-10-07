import { HELP_ARTICLES, HELP_CATEGORIES } from "../help-content";

/**
 * Soporte Cripqer — KNOWLEDGE del asistente de ayuda.
 *
 * El asistente NO mantiene una copia propia del contenido: su conocimiento se
 * construye desde `src/lib/help-content.ts`, la MISMA fuente canónica que
 * renderiza la FAQ visible en /help. Si una respuesta cambia, cambia para los
 * dos a la vez — imposible que la FAQ diga una cosa y el bot responda otra.
 *
 * Sin RAG en V1: la FAQ completa cabe holgadamente en el contexto (30 artículos
 * cortos) y es determinista. Aquí nunca entra contenido del usuario.
 *
 * Frontera diseñada para reemplazo: cuando exista una base de conocimiento real
 * (o RAG), solo este módulo cambia; el contrato y el motor no se tocan.
 */

export function buildKnowledgeContext(): string {
  const lines: string[] = [];
  lines.push("CONOCIMIENTO OFICIAL DE CRIPQER (FAQ actualizada):");
  lines.push("");

  for (const category of HELP_CATEGORIES) {
    const articles = HELP_ARTICLES.filter((a) => a.category === category.id);
    if (articles.length === 0) continue;
    lines.push(`## ${category.label}`);
    for (const article of articles) {
      lines.push(`P: ${article.question}`);
      lines.push(`R: ${article.answer}`);
      if (article.keywords?.length) {
        lines.push(`Temas relacionados: ${article.keywords.join(", ")}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trim();
}
