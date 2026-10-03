import OpenAI from "openai";
import { getServerSupabaseClient } from "../supabase/server";
import { pageService } from "../../services/page.service";
import { isMagicPageDocument } from "../../features/magic-page-editor-production/magic-document";
import { LANDING_BOT_FREE_DAILY_LIMIT, normalizeLandingBot } from "./config";
import type { LandingBotConfig } from "../../isolated/magic-page-editor/types/editor";
import type { LandingBotChatMessage } from "./server";

// Per-instance daily quota. NOTE: memory only — swap for a DB-backed table
// (`landing_bot_usage`) in F2 for durable, cross-instance enforcement.
const quota = new Map<string, { day: string; count: number }>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function consumeQuota(publicId: string): boolean {
  const day = today();
  const entry = quota.get(publicId);
  if (!entry || entry.day !== day) {
    quota.set(publicId, { day, count: 1 });
    return true;
  }
  if (entry.count >= LANDING_BOT_FREE_DAILY_LIMIT) return false;
  entry.count += 1;
  return true;
}

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

  const bot = normalizeLandingBot(page.published_template_config.bot);
  if (!bot.enabled) return { reply: "El asistente aún no está disponible." };
  if (!consumeQuota(publicId)) {
    return {
      reply: "El asistente alcanzó su cupo gratuito por hoy. Vuelve a intentarlo más tarde.",
      limited: true,
    };
  }

  const chatMessages = [
    { role: "system", content: buildSystemPrompt(bot) },
    ...messages.map((message) => ({ role: message.role, content: message.content })),
  ];

  const deepseekKey = process.env.DEEPSEEK_API_KEY || "";
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

  const fallbackKey = process.env.FALLBACK_API_KEY || "";
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
