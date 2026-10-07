import { describe, expect, it } from "vitest";
import { detectSecuritySignal, detectTicketIntent } from "../intent";

/**
 * Detección de intención: decide cuándo el chat OFRECE preparar un ticket y
 * cuándo el servidor ESCALA un ticket a seguridad. Es conservadora a propósito.
 */

describe("detectTicketIntent", () => {
  it("reconoce peticiones explícitas de ticket", () => {
    expect(detectTicketIntent("quiero crear un ticket")).toBe(true);
    expect(detectTicketIntent("créame un ticket por favor")).toBe(true);
    expect(detectTicketIntent("necesito soporte humano")).toBe(true);
    expect(detectTicketIntent("quiero poner un reclamo")).toBe(true);
  });

  it("reconoce la intención sin la palabra ticket", () => {
    expect(detectTicketIntent("quiero hablar con una persona")).toBe(true);
    expect(detectTicketIntent("quiero reportar un problema")).toBe(true);
    expect(detectTicketIntent("quiero hablar con soporte")).toBe(true);
  });

  it("no se dispara con conversación normal", () => {
    expect(detectTicketIntent("¿cómo cambio los colores de mi página?")).toBe(false);
    expect(detectTicketIntent("gracias, ya funcionó")).toBe(false);
    expect(detectTicketIntent("")).toBe(false);
  });

  it("respeta la negación: no ofrece si la persona lo descarta", () => {
    expect(detectTicketIntent("no quiero un ticket, solo dime cómo hacerlo")).toBe(false);
    expect(detectTicketIntent("ya creé un ticket ayer")).toBe(false);
    expect(detectTicketIntent("no necesito ticket")).toBe(false);
  });

  it("ignora acentos y mayúsculas", () => {
    expect(detectTicketIntent("QUIERO UN TICKET")).toBe(true);
    expect(detectTicketIntent("quiero hablar con una persona real")).toBe(true);
  });
});

describe("detectSecuritySignal", () => {
  it("detecta señales de seguridad", () => {
    expect(detectSecuritySignal("alguien accedió a mi cuenta sin permiso")).toBe(true);
    expect(detectSecuritySignal("me hackearon la cuenta")).toBe(true);
    expect(detectSecuritySignal("hay un cargo no reconocido en mi tarjeta")).toBe(true);
    expect(detectSecuritySignal("encontré una vulnerabilidad")).toBe(true);
  });

  it("no se dispara con problemas normales", () => {
    expect(detectSecuritySignal("no puedo publicar mi página")).toBe(false);
    expect(detectSecuritySignal("cómo cambio mi paleta de colores")).toBe(false);
    expect(detectSecuritySignal("")).toBe(false);
  });
});
