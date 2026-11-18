import { describe, expect, it } from "vitest";
import { applyAgentResponse, emptyContext, runAgent } from "../../utils/agent";
import { PRODUCT_KNOWLEDGE, productKnowledgeForQuestion } from "../productKnowledge";
import { competitiveKnowledgeForQuestion } from "../competitiveKnowledge";
import { alignTextWithActions } from "../deepseekProvider";
import { createDeepSeekAssistantProvider } from "../deepseekProvider";
import { detectCommercialNeed, GALLERY_AVAILABILITY_TEXT } from "../commercialNeeds";
import { normalizeAssistantText } from "../responseText";
import { getTemplate, resolveContent } from "../../utils/templates";

function optionLabels(text: string): string[] {
  const response = runAgent(text, emptyContext());
  const action = response.actions.find((item) => item.type === "SHOW_OPTIONS");
  return action?.type === "SHOW_OPTIONS" ? action.options.map((item) => item.label) : [];
}

describe("commercial landing conversation", () => {
  it("uses contextual actions instead of business categories for a value question", () => {
    const response = runAgent("¿Es importante tener una landing en mis redes?", emptyContext());

    expect(response.text).toMatch(/redes|Instagram/i);
    expect(optionLabels("¿Es importante tener una landing en mis redes?")).toEqual([
      "Crear mi página",
      "Ver diseños",
    ]);
  });

  it("does not restart onboarding when a commercial question mentions Instagram", () => {
    const response = runAgent(
      "Tengo Instagram, pero la gente se pierde entre mis publicaciones y no sabe cómo contactarme.",
      emptyContext(),
    );

    expect(response.text).toMatch(/Instagram|contacto|página/i);
    expect(optionLabels("Tengo Instagram, pero la gente se pierde entre mis publicaciones y no sabe cómo contactarme.")).toEqual([
      "Crear mi página",
      "Ver diseños",
    ]);
  });

  it("answers Linktree and Beacons with a direct Cripqer recommendation", () => {
    const linktree = runAgent("¿Qué diferencia hay entre Cripqer y Linktree?", emptyContext());
    const beacons = runAgent("¿Qué es Beacons y cómo se diferencia?", emptyContext());

    expect(linktree.text).toMatch(/Linktree.*Cripqer.*mejor decisión/i);
    expect(beacons.text).toMatch(/Beacons.*Cripqer.*mejor decisión/i);
    expect(optionLabels("¿Qué diferencia hay entre Cripqer y Linktree?")).toEqual([
      "Crear mi página",
      "Ver diseños",
    ]);
  });

  it("makes the first greeting useful and conversion-oriented", () => {
    const response = runAgent("hola como estan", emptyContext());

    expect(response.text).toMatch(/Cripqer|landing|contact/i);
    expect(optionLabels("hola como estan")).toContain("Quiero crear mi página");
    expect(optionLabels("hola como estan")).not.toContain("Mascotas");
  });

  it("keeps the paid grounding smaller while retaining the relevant facts", () => {
    const generic = productKnowledgeForQuestion("¿Cómo funciona una landing?");
    const comparison = productKnowledgeForQuestion("¿Qué diferencia hay con Beacons?");

    expect(generic.length).toBeLessThan(PRODUCT_KNOWLEDGE.length);
    expect(generic.length).toBeLessThanOrEqual(7200);
    expect(generic).not.toMatch(/BEACONS/);
    expect(comparison).not.toMatch(/BEACONS|Linktree/);
    expect(comparison.length).toBeLessThanOrEqual(7200);
  });

  it("loads competitive intelligence only for a comparison intent", () => {
    const ordinary = competitiveKnowledgeForQuestion("¿Cómo funciona el QR?");
    const comparison = competitiveKnowledgeForQuestion("¿Cripqer es mejor que Carrd?");

    expect(ordinary).toBe("");
    expect(comparison).toMatch(/CARRD|carrd/i);
    expect(comparison).toMatch(/mejor decisión|encaje/i);
    expect(comparison.length).toBeLessThanOrEqual(5200);
  });

  it("keeps remote prose aligned with the template action shown in the UI", () => {
    const aligned = alignTextWithActions("Perfecto, vamos a prepararlo.", [
      { type: "RECOMMEND_TEMPLATES", ids: ["soft_beauty", "editorial_luxury"] },
    ]);

    expect(aligned).toMatch(/estilos|elige|personalizar/i);
  });

  it("answers the free-plan objection with verified affirmative wording", () => {
    const response = runAgent("No tengo dinero, ¿puedo empezar gratis?", emptyContext());

    expect(response.text).toMatch(/nivel gratuito incluye crear, editar y publicar/i);
    expect(response.text).not.toMatch(/suelen|quizás|la mayoría/i);
  });

  it("uses hair-specific demo content for a peluquería without changing the visual family", () => {
    const response = runAgent(
      "Tengo una peluquería y quiero reservas por WhatsApp.",
      emptyContext(),
    );
    const applied = applyAgentResponse(emptyContext(), response);
    const templateId = response.actions.find((action) => action.type === "RECOMMEND_TEMPLATES")?.ids[0];
    const content = templateId ? resolveContent(getTemplate(templateId), applied.context) : null;

    expect(applied.context.businessIdentity.type).toBe("hair_salon");
    expect(content?.role).toMatch(/peluquería/i);
    expect(content?.services.map((service) => service.title).join(" ")).toMatch(/corte|color|peinado/i);
  });

  it("presents profession-specific references only when a matching content pack exists", () => {
    const hair = runAgent("Tengo una peluquería y quiero ver diseños", emptyContext());
    const hairApplied = applyAgentResponse(emptyContext(), hair);
    const hairNext = runAgent("Muéstrame diseños", hairApplied.context);

    expect(hairNext.text).toMatch(/peluquería|referencias visuales/i);
    expect(hairNext.actions.some((action) => action.type === "PREVIEW_TEMPLATE")).toBe(true);

    const unknown = runAgent("Soy electricista y quiero ver diseños", emptyContext());
    expect(unknown.text).toMatch(/no necesitas|referencias de estilo|adaptar/i);
    expect(unknown.text).not.toMatch(/barbería|veterinaria|restaurante/i);
    expect(unknown.actions.some((action) => action.type === "RECOMMEND_TEMPLATES")).toBe(true);
    const unknownApplied = applyAgentResponse(emptyContext(), unknown);
    const unknownId = unknown.actions.find((action) => action.type === "RECOMMEND_TEMPLATES")?.ids[0];
    const neutralContent = unknownId ? resolveContent(getTemplate(unknownId), unknownApplied.context) : null;
    expect(neutralContent?.role).toBe("Presencia digital");
    expect(neutralContent?.name).toBe("Tu proyecto");
  });

  it("does not force a demo for an unknown profession that asks to create directly", () => {
    const response = runAgent("Soy electricista y quiero crear mi página ahora", emptyContext());
    const actionTypes = response.actions.map((action) => action.type);

    expect(response.text).toMatch(/vamos a preparar|personalizar.*editor/i);
    expect(actionTypes).toContain("SELECT_TEMPLATE");
    expect(actionTypes).toContain("CREATE_PAGE");
    expect(actionTypes).not.toContain("RECOMMEND_TEMPLATES");
  });

  it("treats a design preference as an intent even when the profession is not catalogued", () => {
    const response = runAgent("Soy electricista y quiero un diseño moderno", emptyContext());
    const recommendation = response.actions.find((action) => action.type === "RECOMMEND_TEMPLATES");

    expect(response.text).toMatch(/moderno|adaptar/i);
    expect(recommendation?.type).toBe("RECOMMEND_TEMPLATES");
    expect(recommendation?.ids).toEqual(["minimal_premium", "professional_trust", "bold_creative"]);
  });

  it("keeps platform comparison separate from template presentation", () => {
    const response = runAgent("¿Qué diferencia hay entre Cripqer y Beacons?", emptyContext());

    expect(response.text).toMatch(/Beacons|Cripqer/i);
    expect(response.actions.some((action) => action.type === "RECOMMEND_TEMPLATES")).toBe(false);
    expect(response.actions.some((action) => action.type === "SHOW_OPTIONS")).toBe(true);
  });

  it("handles an existing Linktree without pressuring migration", () => {
    const response = runAgent("Ya tengo Linktree, ¿por qué cambiar?", emptyContext());

    expect(response.text).toMatch(/no necesitas cambiar|encaja|comparación justa/i);
    expect(response.text).not.toMatch(/registra|crear tu página ahora/i);
    expect(optionLabels("Ya tengo Linktree, ¿por qué cambiar?")).toEqual([
      "Comparar funciones",
      "Ver diseños",
    ]);
  });

  it("answers feature parity honestly instead of inventing exclusivity", () => {
    const response = runAgent("Eso también lo hace Linktree", emptyContext());

    expect(response.text).toMatch(/Tienes razón|no son funciones exclusivas|encaje/i);
    expect(response.text).not.toMatch(/solo Cripqer|exclusivo de Cripqer/i);
    expect(response.text).not.toMatch(/¿Quieres crear tu página ahora\?/i);
  });

  it("handles skepticism with a concrete test and a discovery question", () => {
    const response = runAgent("No me has dicho nada excepcional", emptyContext());

    expect(response.text).toMatch(/prueba concreta|qué parte necesitas evaluar|válido/i);
    expect(response.text).not.toMatch(/registr|crear tu página ahora/i);
    expect(optionLabels("No me has dicho nada excepcional")).toContain("Resolver mis dudas");
  });

  it("handles price objections with confirmed free capabilities", () => {
    const response = runAgent("¿Debo pagar?", emptyContext());

    expect(response.text).toMatch(/nivel gratuito incluye crear, editar y publicar/i);
    expect(response.text).toMatch(/qué necesitas además|te alcance/i);
    expect(response.text).not.toMatch(/suelen|quizás|la mayoría/i);
  });

  it("gives a fit-based reason when asked to be convinced", () => {
    const response = runAgent("Convénceme de probar Cripqer", emptyContext());

    expect(response.text).toMatch(/razón comprobable|no una promesa|puede ser una mejor decisión/i);
    expect(response.text).not.toMatch(/somos los mejores|garantizamos/i);
    expect(optionLabels("Convénceme de probar Cripqer")).toEqual(["Ver diseños", "Crear mi página"]);
  });

  it("respects a clear rejection without returning sales CTAs", () => {
    const response = runAgent("No quiero registrarme", emptyContext());

    expect(response.text).toMatch(/Entendido|sin presión/i);
    expect(response.actions).toEqual([]);
  });

  it("routes WhatsApp booking requests to contact, not a future calendar", () => {
    const response = runAgent(
      "Tengo una peluquería, pero necesito conseguir reservas por WhatsApp.",
      emptyContext(),
    );

    expect(detectCommercialNeed("Tengo una peluquería, necesito reservas por WhatsApp")).toBe("whatsapp_contact");
    expect(response.text).toMatch(/recibir solicitudes.*WhatsApp|botón visible/i);
    expect(response.text).toMatch(/no es un calendario|no.*confirma disponibilidad/i);
    expect(response.text).not.toMatch(/disponible próximamente|por ahora.*tarjeta/i);
    expect(response.actions.some((action) => action.type === "SHOW_OPTIONS")).toBe(true);
  });

  it("separates native calendar requests from WhatsApp contact", () => {
    const response = runAgent("Necesito un calendario de reservas con disponibilidad", emptyContext());

    expect(detectCommercialNeed("Necesito un calendario de reservas con disponibilidad")).toBe("native_booking_limit");
    expect(response.text).toMatch(/calendario|disponibilidad/i);
    expect(response.text).toMatch(/WhatsApp|enlace externo/i);
    expect(response.text).not.toMatch(/reservas nativas.*disponible próximamente/i);
  });

  it("explains WhatsApp orders without inventing online checkout", () => {
    const response = runAgent("Quiero recibir pedidos por WhatsApp", emptyContext());

    expect(detectCommercialNeed("Quiero recibir pedidos por WhatsApp")).toBe("whatsapp_orders");
    expect(response.text).toMatch(/productos|pedidos|botón directo/i);
    expect(response.text).toMatch(/no.*cobro online|checkout.*no está confirmado/i);
  });

  it("protects the WhatsApp route before making a DeepSeek request", async () => {
    const provider = createDeepSeekAssistantProvider();
    const response = await provider.respond({
      intent: { kind: "message", text: "Quiero recibir reservas por WhatsApp" },
      context: emptyContext(),
      history: [],
    });

    expect(response.metadata.model).toBe("deterministic-commercial-route");
    expect(response.text).toMatch(/WhatsApp/i);
    expect(response.text).not.toMatch(/próximamente/i);
  });

  it("answers a gallery restriction without exposing internal flags", () => {
    const response = runAgent("La galería está bloqueada, ¿qué puedo hacer?", emptyContext());

    expect(response.text).toBe(GALLERY_AVAILABILITY_TEXT);
    expect(response.text).not.toMatch(/VITE_|flag|entorno|QA|infraestructura/i);
    expect(response.actions.some((action) => action.type === "SHOW_OPTIONS")).toBe(true);
  });

  it("renders provider Markdown as plain conversational text", () => {
    const text = normalizeAssistantText("- **Linktree**: enlaces\n- \\*Cripqer\\*: página comercial");

    expect(text).toBe("• Linktree: enlaces\n• Cripqer: página comercial");
    expect(text).not.toContain("**");
    expect(text).not.toContain("\\*");
  });
});
