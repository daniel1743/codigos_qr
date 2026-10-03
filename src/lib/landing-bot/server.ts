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
      const { resolveEntitlement } = await import("../../server/billing/entitlements");
      const { requireBillingUser } = await import("../../server/billing/auth");
      const { getCanonicalSubscriptionForUser } = await import("../../server/billing/persistence");
      const user = await requireBillingUser();
      const subscription = await getCanonicalSubscriptionForUser(user.userId);
      return resolveEntitlement(subscription).effectiveTier;
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
