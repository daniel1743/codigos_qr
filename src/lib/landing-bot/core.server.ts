import OpenAI from "openai";
import { getServerSupabaseClient } from "../supabase/server";
import { pageService } from "../../services/page.service";
import { isMagicPageDocument } from "../../features/magic-page-editor-production/magic-document";
import { normalizeLandingBot } from "./config";
import { createInMemoryQuota } from "./quota";
import { consumeLandingBotQuota } from "./quota.server";
import { applyLandingBotTierPolicy } from "./tier-policy";
import { resolveLandingBotOwner } from "./owner.server";
import { createRateLimiter } from "./rate-limit";
import type { LandingBotConfig } from "../../isolated/magic-page-editor/types/editor";
import type { LandingBotChatMessage } from "./server";

// Burst protection (per public_id). The durable monthly quota lives in Supabase
// (`consume_landing_bot_quota`); the in-memory store is only a fail-safe fallback.
const rateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
const inMemoryQuota = createInMemoryQuota();

function toneInstruction(tone: LandingBotConfig["tone"]): string {
  if (tone === "formal") return "Usa un tono formal y profesional, tratando de 'usted'.";
  if (tone === "profesional") return "Usa un tono profesional pero cercano.";
  return "Usa un tono cercano, cálido y natural, tratando de 'tú'.";
}

function buildSystemPrompt(bot: LandingBotConfig): string {
  const lines: string[] = [];
  lines.push(`Eres "${bot.name || "Asistente"}", el asistente virtual de esta página.`);
  lines.push("Responde SIEMPRE en español, breve y claro. " + toneInstruction(bot.tone));
  lines.push("");
  lines.push("INFORMACIÓN DEL DUEÑO DE LA PÁGINA:");
  if (bot.about.trim()) lines.push(`- Quién es / qué hace: ${bot.about.trim()}`);
  if (bot.services.trim()) lines.push(`- Servicios / productos: ${bot.services.trim()}`);
  if (bot.hours.trim()) lines.push(`- Horario: ${bot.hours.trim()}`);
  if (bot.address.trim()) lines.push(`- Dirección: ${bot.address.trim()}`);
  if (bot.stores.trim()) lines.push(`- Tiendas: ${bot.stores.trim()}`);
  if (bot.faq.trim()) lines.push(`- Preguntas frecuentes: ${bot.faq.trim()}`);
  const social = Object.entries(bot.social).filter(([, value]) => value.trim());
  if (social.length) lines.push(`- Redes: ${social.map(([key, value]) => `${key}: ${value.trim()}`).join(", ")}`);
  if (bot.prices.enabled) lines.push(`- Puede compartir precios (moneda ${bot.prices.currency}).`);
  lines.push("");
  lines.push("REGLAS:");
  lines.push("- Usa únicamente la información de arriba. Si algo no lo sabes, dilo y ofrece alternativas.");
  lines.push("- No inventes datos, precios ni disponibilidad.");
  if (bot.whatsappEnabled && bot.whatsapp.trim()) {
    lines.push("- Si el usuario quiere contactar, ofrécele escribir por WhatsApp.");
  }
  lines.push("");
  lines.push("FORMATO:");
  lines.push("- Comienza con un emoji y usa líneas cortas; deja una línea en blanco entre párrafos.");
  lines.push("- Listas con guiones cuando enumeres. Usa **negrita** solo para datos clave. Sin encabezados # ni tablas.");
  lines.push("- Termina con una pregunta breve.");
  return lines.join("\n");
}

function createClient(baseURL: string, apiKey: string): OpenAI {
  return new OpenAI({ baseURL, apiKey });
}

export async function answerLandingBot(
  publicId: string,
  messages: LandingBotChatMessage[],
): Promise<{ reply: string; limited?: boolean }> {
  const supabase = getServerSupabaseClient();
  const page = await pageService.getPublicPageByPublicId(supabase, publicId);
  if (!page || !isMagicPageDocument(page.published_template_config)) {
    return { reply: "El asistente no está disponible en este momento." };
  }

  const storedBot = normalizeLandingBot(page.published_template_config.bot);
  if (!storedBot.enabled) return { reply: "El asistente aún no está disponible." };

  // Burst rate limit (does not consume quota when blocked).
  if (!rateLimiter.check(publicId)) {
    return {
      reply: "Demasiadas solicitudes seguidas. Espera un momento e intenta de nuevo.",
      limited: true,
    };
  }

  // Server-side tier resolution + durable monthly quota (server-side authority).
  const owner = await resolveLandingBotOwner(publicId);
  const quotaDecision = await consumeLandingBotQuota(publicId, owner.tier, inMemoryQuota);
  if (!quotaDecision.allowed) {
    return {
      reply: "El asistente alcanzó su cupo gratuito de este mes. Vuelve a intentarlo más tarde.",
      limited: true,
    };
  }

  // Never trust the client: strip Pro-only fields for non-Pro owners.
  const bot = applyLandingBotTierPolicy(storedBot, owner.tier);

  const chatMessages = [
    { role: "system", content: buildSystemPrompt(bot) },
    ...messages.map((message) => ({ role: message.role, content: message.content })),
  ];

  const deepseekKey = process.env.DEEPSEEK_API_KEY || "";
  const fallbackKey = process.env.FALLBACK_API_KEY || "";
  if (!deepseekKey && !fallbackKey && process.env["NODE_ENV"] !== "production") {
    console.warn(
      "[landing-bot] Sin proveedor de IA: define DEEPSEEK_API_KEY o FALLBACK_API_KEY (p. ej. en .env.local) para probar el asistente en local.",
    );
  }
  if (deepseekKey) {
    try {
      const primary = createClient(
        process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
        deepseekKey,
      );
      const completion = await primary.chat.completions.create({
        messages: chatMessages,
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return { reply: text };
    } catch (error) {
      console.warn("[landing-bot] DeepSeek falló, probando fallback.", error);
    }
  }

  if (fallbackKey) {
    try {
      const fallback = createClient(
        process.env.FALLBACK_BASE_URL || "https://api.deepseek.com",
        fallbackKey,
      );
      const completion = await fallback.chat.completions.create({
        messages: chatMessages,
        model: process.env.FALLBACK_MODEL || "qwen3.8-flash",
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return { reply: text };
    } catch (error) {
      console.warn("[landing-bot] Fallback falló.", error);
    }
  }

  return { reply: "No pude responder ahora mismo. Intenta de nuevo en un momento." };
}
