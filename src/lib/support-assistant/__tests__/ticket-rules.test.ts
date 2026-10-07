import { describe, expect, it } from "vitest";
import { resolveTicketCategory } from "../ticket-rules";

/**
 * Reglas de creación: la categoría del cliente se filtra, la prioridad se
 * deriva y una señal de seguridad ESCALA aunque el formulario diga otra cosa.
 */

const base = {
  subject: "No puedo publicar mi página",
  description: "Se queda cargando al pulsar Publicar.",
  conversation: [{ role: "user" as const, content: "No puedo publicar mi página" }],
};

describe("resolveTicketCategory", () => {
  it("respeta una categoría válida y deriva prioridad normal", () => {
    expect(resolveTicketCategory({ ...base, category: "usage" })).toEqual({
      category: "usage",
      priority: "normal",
    });
  });

  it("manda a «other» cualquier categoría fuera de la allowlist", () => {
    expect(resolveTicketCategory({ ...base, category: "urgente" }).category).toBe("other");
    expect(resolveTicketCategory({ ...base, category: "" }).category).toBe("other");
  });

  it("escala a seguridad desde la categoría", () => {
    expect(resolveTicketCategory({ ...base, category: "security" })).toEqual({
      category: "security",
      priority: "high",
    });
  });

  it("escala a seguridad aunque el usuario haya elegido «Otro»", () => {
    const result = resolveTicketCategory({
      ...base,
      category: "other",
      description: "Alguien accedió a mi cuenta sin permiso.",
    });
    expect(result.category).toBe("security");
    expect(result.priority).toBe("high");
  });

  it("detecta la señal de seguridad escondida en la conversación", () => {
    const result = resolveTicketCategory({
      ...base,
      subject: "Consulta general",
      description: "Quería preguntar una cosa",
      category: "billing",
      conversation: [
        { role: "user", content: "Hola" },
        { role: "assistant", content: "¿En qué te ayudo?" },
        { role: "user", content: "hay un cargo no reconocido en mi tarjeta" },
      ],
    });
    expect(result.category).toBe("security");
    expect(result.priority).toBe("high");
  });

  it("no escala cuando no hay señal", () => {
    const result = resolveTicketCategory({ ...base, category: "account" });
    expect(result.category).toBe("account");
    expect(result.priority).toBe("normal");
  });
});
