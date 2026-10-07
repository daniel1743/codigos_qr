import { createServerFn } from "@tanstack/react-start";

export interface LandingBotChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LandingBotAnswer {
  reply: string;
  limited?: boolean;
}

/**
 * Read-only plan boundary for the editor UI. Resolves the owner's effective tier
 * server-side (never from a browser flag). Fails closed to "free".
 */
export const getLandingBotPlanFn = createServerFn({ method: "GET", strict: false }).handler(
  async (): Promise<string> => {
    try {
      // B0 — the ONE decision service. It resolves both canonical sources (paid
      // subscription and grants) instead of the subscription alone, which is what
      // previously made an invited user look free here and Premium in the studio.
      const { resolveUserPlan } = await import("../../server/billing/plan-service");
      const { requireBillingUser } = await import("../../server/billing/auth");
      const user = await requireBillingUser();
      return (await resolveUserPlan(user.userId)).effectiveTier;
    } catch {
      return "free";
    }
  },
);

function normalizeMessages(input: unknown): LandingBotChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(-12)
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const content = (raw as { content?: unknown }).content;
      if (typeof content !== "string") return null;
      const role = (raw as { role?: unknown }).role === "assistant" ? "assistant" : "user";
      return { role, content: content.slice(0, 2000) } as LandingBotChatMessage;
    })
    .filter((m): m is LandingBotChatMessage => m !== null);
}

/**
 * Public entrypoint used by the rendered landing bot. The visitor supplies only
 * the page public id + chat messages; everything else is resolved server-side.
 */
export const askLandingBotFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Solicitud inválida.");
    const { publicId, messages } = input as { publicId?: unknown; messages?: unknown };
    if (typeof publicId !== "string" || !publicId) throw new Error("Solicitud inválida.");
    return { publicId, messages: normalizeMessages(messages) };
  })
  .handler(async ({ data }): Promise<LandingBotAnswer> => {
    const { answerLandingBot } = await import("./core.server");
    return answerLandingBot(data.publicId, data.messages);
  });
