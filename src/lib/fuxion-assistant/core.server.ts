import "@tanstack/react-start/server-only";
import OpenAI from "openai";
import { createRateLimiter } from "../landing-bot/rate-limit";
import type { FuxionAssistantMessage } from "./server";

// The demo is development-only; this still caps accidental loops while testing.
const demoRateLimit = createRateLimiter({ windowMs: 60_000, max: 10 });
const MAX_COMPLETION_TOKENS = 400;

function createProviderClient(baseURL: string, apiKey: string) {
  return new OpenAI({ baseURL, apiKey, maxRetries: 0, timeout: 15_000 });
}

export async function answerFuxionAssistant(
  systemPrompt: string,
  messages: FuxionAssistantMessage[],
): Promise<{ reply: string }> {
  if (!demoRateLimit.check("fuxion-demo")) {
    return { reply: "Hay muchas consultas en este momento. Espera un minuto e intenta otra vez." };
  }

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages,
  ];
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  const fallbackKey = process.env.FALLBACK_API_KEY?.trim();

  if (deepseekKey) {
    try {
      const client = createProviderClient(
        process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
        deepseekKey,
      );
      const result = await client.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: chatMessages,
        max_tokens: MAX_COMPLETION_TOKENS,
      });
      const reply = result.choices[0]?.message?.content?.trim();
      if (reply) return { reply };
    } catch (error) {
      console.warn("[fuxion-assistant] DeepSeek request failed.", error);
    }
  }

  if (fallbackKey) {
    try {
      const client = createProviderClient(
        process.env.FALLBACK_BASE_URL || "https://oneprovider.dev/api/v1",
        fallbackKey,
      );
      const result = await client.chat.completions.create({
        model: process.env.FALLBACK_MODEL || "qwen3.8-flash",
        messages: chatMessages,
        max_tokens: MAX_COMPLETION_TOKENS,
      });
      const reply = result.choices[0]?.message?.content?.trim();
      if (reply) return { reply };
    } catch (error) {
      console.warn("[fuxion-assistant] Fallback request failed.", error);
    }
  }

  return { reply: "No pude responder ahora. Intenta de nuevo en un momento." };
}
