import { createServerFn } from "@tanstack/react-start";

export interface FuxionAssistantMessage {
  role: "user" | "assistant";
  content: string;
}

function validateAssistantInput(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Solicitud inválida.");
  const value = input as { systemPrompt?: unknown; messages?: unknown };
  if (typeof value.systemPrompt !== "string" || !Array.isArray(value.messages)) {
    throw new Error("Solicitud inválida.");
  }

  const messages = value.messages
    .slice(-8)
    .map((message: unknown): FuxionAssistantMessage | null => {
      if (!message || typeof message !== "object") return null;
      const item = message as { role?: unknown; content?: unknown };
      if (item.role !== "user" && item.role !== "assistant") return null;
      if (typeof item.content !== "string" || !item.content.trim()) return null;
      return { role: item.role, content: item.content.trim().slice(0, 1200) };
    })
    .filter((message: FuxionAssistantMessage | null): message is FuxionAssistantMessage => message !== null);

  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    throw new Error("Solicitud inválida.");
  }

  return {
    systemPrompt: value.systemPrompt.slice(0, 12_000),
    messages,
  };
}

/**
 * Legacy FuXion demo endpoint. It is deliberately disabled in production;
 * provider credentials are read only by the server implementation.
 */
export const askFuxionAssistantFn = createServerFn({ method: "POST" })
  .validator(validateAssistantInput)
  .handler(async ({ data }): Promise<{ reply: string }> => {
    if (import.meta.env.PROD) {
      return { reply: "El asistente de demostración no está disponible." };
    }
    const { answerFuxionAssistant } = await import("./core.server");
    return answerFuxionAssistant(data.systemPrompt, data.messages);
  });
