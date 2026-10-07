import { describe, expect, it } from "vitest";
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  getHelpArticle,
  searchHelpArticles,
} from "../help-content";

/**
 * Fuente canónica de ayuda/FAQ. Protege lo que consumen la página /help y el
 * Asistente de ayuda (support-assistant/knowledge.server.ts): si la FAQ cambia,
 * el bot cambia con ella por construcción.
 */

const EXPECTED_IDS = [
  "what_is_cripqer",
  "need_design_or_code",
  "start_from_zero",
  "edit_after_print",
  "edit_page",
  "changes_not_visible",
  "private_qr",
  "page_sections",
  "unpublish_page",
  "custom_vs_permanent_link",
  "download_qr",
  "qr_formats",
  "qr_design",
  "page_qr",
  "qr_changes",
  "change_colors",
  "change_template",
  "own_logo",
  "qr_scan_analytics",
  "realtime_analytics",
  "protect_document",
  "document_options",
  "document_privacy",
  "change_account_data",
  "logout",
  "free_plan",
  "how_to_get_help",
  "forgot_password",
  "change_email",
  "delete_account",
  "change_plan",
];

describe("help-content (fuente canónica)", () => {
  it("tiene las 31 FAQ en el orden esperado", () => {
    expect(HELP_ARTICLES.map((a) => a.id)).toEqual(EXPECTED_IDS);
  });

  // La categoría `limites` existe para que el asistente diga la verdad cuando algo no
  // está implementado, en vez de describir un flujo que el usuario no encontrará.
  it("los artículos de límites empiezan reconociendo que la función no está", () => {
    const limits = HELP_ARTICLES.filter((a) => a.category === "limites");
    expect(limits.length).toBeGreaterThan(0);
    for (const article of limits) {
      expect(article.answer.startsWith("Todavía no")).toBe(true);
    }
  });

  it("cada FAQ tiene pregunta y respuesta no vacías", () => {
    for (const article of HELP_ARTICLES) {
      expect(article.question.trim().length).toBeGreaterThan(0);
      expect(article.answer.trim().length).toBeGreaterThan(0);
    }
  });

  it("cada artículo pertenece a una categoría existente", () => {
    const categoryIds = new Set(HELP_CATEGORIES.map((c) => c.id));
    for (const article of HELP_ARTICLES) {
      expect(categoryIds.has(article.category)).toBe(true);
    }
  });

  it("todas las categorías tienen al menos un artículo", () => {
    for (const category of HELP_CATEGORIES) {
      expect(HELP_ARTICLES.some((a) => a.category === category.id)).toBe(true);
    }
  });

  it("nunca escribe 'Cricker' y sí usa 'Cripqer'", () => {
    const text = JSON.stringify(HELP_ARTICLES).toLowerCase();
    expect(text).not.toContain("cricker");
    expect(text).toContain("cripqer");
  });

  it("el buscador entiende sinónimos y paráfrasis", () => {
    expect(searchHelpArticles("logo").map((a) => a.id)).toContain("own_logo");
    expect(searchHelpArticles("no se programar").map((a) => a.id)).toContain("need_design_or_code");
    expect(searchHelpArticles("escaneos").map((a) => a.id)).toContain("qr_scan_analytics");
    expect(searchHelpArticles("imprimi tarjetas").map((a) => a.id)).toContain("edit_after_print");
    expect(searchHelpArticles("mi marca").map((a) => a.id)).toContain("own_logo");
  });

  it("getHelpArticle resuelve por id", () => {
    expect(getHelpArticle("qr_changes")?.question).toContain("QR cambia");
    expect(getHelpArticle("does_not_exist")).toBeUndefined();
  });
});
