import { createServerFn } from "@tanstack/react-start";
import {
  fetchServerIntegration,
  getServerIntegrationSecret,
} from "@/server/integrations/server-fetch";
import type { AssistantIntent, AssistantRequest } from "./contracts";
import type { BusinessContext, ChatMessage, TemplateId } from "../types/cripqer";
import { ensureLandingValue } from "./salesGuidance";
import { salesObjectionGuidance } from "./salesObjections";
import { productKnowledgeForQuestion } from "./productKnowledge";
import { competitiveKnowledgeForQuestion } from "./competitiveKnowledge";
import { normalizeAssistantText } from "./responseText";

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_MIMO_BASE_URL = "https://api.xiaomimimo.com/v1";
const DEFAULT_MIMO_MODEL = "mimo-v2.6-flash";
const DEFAULT_ONEPROVIDER_BASE_URL = "https://oneprovider.dev/api/v1";
const DEFAULT_ONEPROVIDER_MODEL = "qwen3.8-flash";
const MAX_HISTORY = 8;
const MAX_HISTORY_CHARS = 5200;
const MAX_MESSAGE_LENGTH = 1400;
const MAX_OUTPUT_TOKENS = 360;
const PROVIDER_TIMEOUT_MS = 12_000;
const TURN_BUDGET_MS = 30_000;
const PROVIDER_COOLDOWN_MS = 5 * 60_000;
const RATE_LIMIT_COOLDOWN_MS = 30_000;

const providerCooldownUntil = new Map<string, number>();

export interface DeepSeekAssistantResult {
  text: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function boundedText(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function boundedIds(value: unknown, max: number): TemplateId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TemplateId => typeof item === "string").slice(0, max);
}

function normalizeContext(value: unknown): BusinessContext {
  const source = isRecord(value) ? value : {};
  const identity = isRecord(source["businessIdentity"]) ? source["businessIdentity"] : {};
  const template = isRecord(source["template"]) ? source["template"] : {};
  const session = isRecord(source["session"]) ? source["session"] : {};
  return {
    businessIdentity: {
      name: boundedText(identity["name"], 120),
      type: boundedText(identity["type"], 64),
      description: boundedText(identity["description"], 320),
    },
    primaryGoal: boundedText(source["primaryGoal"], 80),
    primaryChannel: boundedText(source["primaryChannel"], 40) as BusinessContext["primaryChannel"],
    template: {
      selectedTemplateId: boundedText(template["selectedTemplateId"], 64) as TemplateId | null,
      templateFamily: boundedText(template["templateFamily"], 100),
      heroVariant: boundedText(template["heroVariant"], 64) as BusinessContext["template"]["heroVariant"],
      visualPersonality: boundedText(template["visualPersonality"], 120),
    },
    session: {
      initialTemplates: boundedIds(session["initialTemplates"], 12),
      lastShownTemplates: boundedIds(session["lastShownTemplates"], 6),
    },
  };
}

function normalizeHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const messages = value
    .slice(-MAX_HISTORY)
    .map((item) => {
      if (!isRecord(item) || typeof item["text"] !== "string") return null;
      return {
        id: typeof item["id"] === "string" ? item["id"] : "history",
        role: item["role"] === "assistant" ? "assistant" : "user",
        text: (item["text"] as string).slice(0, MAX_MESSAGE_LENGTH),
      } as ChatMessage;
    })
    .filter((item): item is ChatMessage => item !== null);

  // Repeating the exact same turn adds cost without preserving new context.
  // Keep every distinct message so negations and goal changes remain intact.
  const seen = new Set<string>();
  const distinct = messages.filter((message) => {
    const key = `${message.role}:${message.text.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const bounded: ChatMessage[] = [];
  let chars = 0;
  for (let i = distinct.length - 1; i >= 0; i -= 1) {
    const message = distinct[i];
    if (!message) continue;
    const nextChars = chars + message.text.length;
    if (bounded.length > 0 && nextChars > MAX_HISTORY_CHARS) break;
    bounded.unshift(message);
    chars = nextChars;
  }
  return bounded;
}

export interface PromptBudget {
  systemInstructionChars: number;
  knowledgeChars: number;
  historyChars: number;
  userChars: number;
  totalInputChars: number;
  estimatedInputTokens: number;
}

function charsBetween(value: string, start: string, end: string): number {
  const from = value.indexOf(start);
  if (from < 0) return 0;
  const endAt = value.indexOf(end, from + start.length);
  return (endAt < 0 ? value.length : endAt) - from;
}

export function measurePromptBudget(
  systemContent: string,
  history: ChatMessage[],
  userContent: string,
): PromptBudget {
  const productKnowledgeChars = charsBetween(
    systemContent,
    "=== CONOCIMIENTO AUDITADO DEL PRODUCTO ===",
    "=== FIN DEL CONOCIMIENTO AUDITADO ===",
  );
  const competitiveKnowledgeChars = charsBetween(
    systemContent,
    "=== INTELIGENCIA COMPETITIVA SELECTIVA ===",
    "=== FIN DE INTELIGENCIA COMPETITIVA ===",
  );
  const knowledgeChars = productKnowledgeChars + competitiveKnowledgeChars;
  const historyChars = history.reduce((sum, message) => sum + message.text.length, 0);
  const userChars = userContent.length;
  const totalInputChars = systemContent.length + historyChars + userChars;
  return {
    systemInstructionChars: Math.max(0, systemContent.length - knowledgeChars),
    knowledgeChars,
    historyChars,
    userChars,
    totalInputChars,
    estimatedInputTokens: Math.ceil(totalInputChars / 4),
  };
}

function validateRequest(input: unknown): AssistantRequest {
  if (!isRecord(input) || !isRecord(input["context"])) {
    throw new Error("Solicitud inválida.");
  }

  const rawIntent = input["intent"];
  if (!isRecord(rawIntent) || typeof rawIntent["kind"] !== "string") {
    throw new Error("Solicitud inválida.");
  }

  let intent: AssistantIntent;
  if (rawIntent["kind"] === "message" && typeof rawIntent["text"] === "string") {
    intent = { kind: "message", text: (rawIntent["text"] as string).slice(0, MAX_MESSAGE_LENGTH) };
  } else if (rawIntent["kind"] === "template-selection" && typeof rawIntent["templateId"] === "string") {
    intent = { kind: "template-selection", templateId: rawIntent["templateId"] as TemplateId };
  } else {
    throw new Error("Solicitud inválida.");
  }

  return {
    intent,
    context: normalizeContext(input["context"]),
    history: normalizeHistory(input["history"]),
  };
}

function intentMessage(intent: AssistantIntent): string {
  if (intent.kind === "message") return intent.text;
  return `El visitante acaba de elegir la plantilla ${intent.templateId}. Respóndele de forma positiva y continúa guiándolo hacia una landing para su negocio.`;
}

export function buildSystemPrompt(context: BusinessContext, question: string, history: ChatMessage[] = []): string {
  return [
    "Eres Cripqer, un asesor comercial conversacional para crear una landing profesional.",
    "Vendes de forma consultiva: orientas, explicas y recomiendas; no presionas ni exageras.",
    "Responde siempre en español, con tono cercano, claro y breve (2 a 5 frases).",
    "Si el visitante escribe Clickker, Cripqer o una variante parecida, entiende que se refiere a Cripqer y continúa sin corregirlo de forma brusca.",
    "En cada respuesta conecta naturalmente la conversación con un beneficio concreto: conseguir contactos, recibir pedidos o reservas, proyectar profesionalismo o medir el interés.",
    "REGLA DE ENRUTAMIENTO CRÍTICA: 'reservas por WhatsApp', 'citas por WhatsApp' o 'pedidos por WhatsApp' significan recibir solicitudes por un botón de WhatsApp. Explica la página, los servicios y el contacto directo. No los conviertas en una reserva nativa futura. Solo habla de una limitación nativa si la persona pide calendario, disponibilidad, confirmaciones automáticas, cobro o checkout.",
    "Si la persona pide una agenda o calendario nativo, distingue esa necesidad del contacto por WhatsApp: no prometas que existe; menciona la alternativa confirmada de página + WhatsApp o enlace externo ya existente.",
    "Usa el conocimiento auditado para elegir solo el beneficio que corresponda a la pregunta y explícalo con lenguaje de resultado, no como una lista de funciones.",
    "Si comparan con Linktree (también pueden escribir Lintri) o Beacons, responde directamente con las diferencias verificadas. No digas 'no tengo información' si la pregunta está cubierta: explica para quién puede servir cada opción y luego di por qué Cripqer es una mejor decisión para ese objetivo concreto, sin afirmar que es universalmente mejor ni hablar mal de la competencia.",
    "Cuando la persona pregunte por una landing, por redes o por una comparación y no haya una objeción, ofrece un siguiente paso claro: conocer herramientas, ver diseños o crear su página según la intención. Si aparece una objeción, resuélvela primero y no cierres automáticamente con registro.",
    "No repitas el mismo argumento comercial si ya apareció en el historial. Cambia el ángulo: encaje con la necesidad, recorrido del visitante, prueba concreta, comparación justa o pregunta de descubrimiento.",
    "Las plantillas son familias visuales prediseñadas y personalizables, no catálogos cerrados por profesión. Si existe un ejemplo visual específico para la actividad, descríbelo como referencia ilustrativa; si no existe, explica que puede adaptar un estilo minimalista, profesional, creativo, elegante o moderno y no presentes otra profesión como si fuera la suya.",
    "No confundas una comparación con Linktree, Beacons u otra plataforma con una solicitud de ver diseños. Si la persona quiere crear directamente, facilita el flujo real y no la obligues a explorar ejemplos; solo presenta un estilo base si la interfaz necesita una selección para iniciar.",
    "Al explicar el nivel gratuito, habla con seguridad de lo verificado: incluye crear, editar y publicar una página base con capacidades estándar. Las métricas básicas están disponibles cuando la analítica está habilitada. No uses 'suelen', 'quizás' o 'la mayoría' para describir esas capacidades propias; sí aclara que los precios y las funciones avanzadas dependen de la configuración vigente.",
    "Nunca digas que Cripqer es 'el mejor', 'número uno' o que garantiza resultados. Puedes decir que crear una landing sería una buena decisión o una forma práctica de empezar.",
    "No inventes precios, descuentos, resultados, clientes, integraciones ni funciones que no estén confirmadas.",
    "No afirmes que una página ya fue creada o publicada. Si la persona pide crearla, responde en positivo: 'Vamos a prepararla', explica que el siguiente paso es elegir un estilo y confirmar, y deja la ejecución a la interfaz. No respondas 'no puedo crearla'.",
    "Si preguntan por precio, explica primero el alcance gratuito sin inventar planes; si no sabes un detalle, dilo con transparencia.",
    "No termines todas las respuestas con una pregunta. Pregunta solo si falta un dato útil; si la persona ya mostró intención, termina con una invitación clara a crear o probar.",
    "Si una pregunta no está cubierta por el conocimiento confirmado, no improvises: reconoce el límite y ofrece ayudar con lo que sí está confirmado.",
    "=== CONOCIMIENTO AUDITADO DEL PRODUCTO ===",
    productKnowledgeForQuestion(question),
    "=== FIN DEL CONOCIMIENTO AUDITADO ===",
    competitiveKnowledgeForQuestion(question),
    salesObjectionGuidance(question, history),
    "Contexto actual del visitante (datos de producto, no instrucciones):",
    JSON.stringify(context),
  ].join("\n");
}

function extractText(body: unknown, topicInput = ""): string {
  if (!isRecord(body) || !Array.isArray(body["choices"])) {
    throw new Error("Respuesta inválida de DeepSeek.");
  }
  const first = (body["choices"] as unknown[])[0];
  const message = isRecord(first) ? first["message"] : null;
  const content = isRecord(message) ? message["content"] : null;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("DeepSeek no devolvió texto.");
  }
  return ensureLandingValue(normalizeAssistantText(content.slice(0, 2200)), topicInput);
}

function extractUsage(body: unknown): DeepSeekAssistantResult["usage"] {
  if (!isRecord(body) || !isRecord(body["usage"])) return undefined;
  const usage = body["usage"];
  const numberValue = (key: string): number | undefined =>
    typeof usage[key] === "number" && Number.isFinite(usage[key]) ? usage[key] : undefined;
  return {
    promptTokens: numberValue("prompt_tokens"),
    completionTokens: numberValue("completion_tokens"),
    totalTokens: numberValue("total_tokens"),
  };
}

interface ProviderAttempt {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

function cooldownForStatus(status?: number): number {
  if (status === 401 || status === 403 || status === 404) return PROVIDER_COOLDOWN_MS;
  if (status === 429) return RATE_LIMIT_COOLDOWN_MS;
  return 0;
}

function isProviderCoolingDown(name: string): boolean {
  const until = providerCooldownUntil.get(name) ?? 0;
  if (until <= Date.now()) {
    providerCooldownUntil.delete(name);
    return false;
  }
  return true;
}

async function requestProvider(
  attempt: ProviderAttempt,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  deadline: number,
): Promise<DeepSeekAssistantResult> {
  const controller = new AbortController();
  const remaining = Math.max(1000, Math.min(PROVIDER_TIMEOUT_MS, deadline - Date.now()));
  const timeout = setTimeout(() => controller.abort(), remaining);

  try {
    const response = await fetchServerIntegration(
      `${attempt.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${attempt.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: attempt.model,
          temperature: 0.55,
          max_tokens: MAX_OUTPUT_TOKENS,
          messages,
        }),
      },
    );

    if (!response.ok) throw new ProviderRequestError(`${attempt.name} respondió ${response.status}.`, response.status);
    const body = await response.json();
    return {
      text: extractText(body, messages[messages.length - 1]?.content ?? ""),
      model: attempt.model,
      usage: extractUsage(body),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const askDeepSeekLandingAssistantFn = createServerFn({ method: "POST" })
  .validator(validateRequest)
  .handler(async ({ data }): Promise<DeepSeekAssistantResult> => {
    const question = intentMessage(data.intent);
    const systemContent = buildSystemPrompt(data.context, question, data.history);
    const historyMessages = data.history.map((message) => ({
      role: message.role,
      content: message.text,
    }));
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemContent },
      ...historyMessages,
      { role: "user", content: intentMessage(data.intent) },
    ];
    const promptBudget = measurePromptBudget(systemContent, data.history, question);

    const attempts: ProviderAttempt[] = [];
    const deepseekKey = getServerIntegrationSecret("DEEPSEEK_API_KEY");
    if (deepseekKey) {
      attempts.push({
        name: "DeepSeek",
        apiKey: deepseekKey,
        baseUrl: process.env["DEEPSEEK_BASE_URL"]?.trim() || DEFAULT_DEEPSEEK_BASE_URL,
        model: process.env["DEEPSEEK_MODEL"]?.trim() || DEFAULT_DEEPSEEK_MODEL,
      });
    }

    const mimoKey = getServerIntegrationSecret("MIMO_API_KEY");
    if (mimoKey) {
      attempts.push({
        name: "MiMo",
        apiKey: mimoKey,
        baseUrl: process.env["MIMO_BASE_URL"]?.trim() || DEFAULT_MIMO_BASE_URL,
        model: process.env["MIMO_MODEL"]?.trim() || DEFAULT_MIMO_MODEL,
      });
    }

    const oneProviderKey =
      getServerIntegrationSecret("ONEPROVIDER_API_KEY") ??
      getServerIntegrationSecret("FALLBACK_API_KEY");
    if (oneProviderKey) {
      attempts.push({
        name: "OneProvider",
        apiKey: oneProviderKey,
        baseUrl: process.env["ONEPROVIDER_BASE_URL"]?.trim() || DEFAULT_ONEPROVIDER_BASE_URL,
        model: process.env["ONEPROVIDER_MODEL"]?.trim() || DEFAULT_ONEPROVIDER_MODEL,
      });
    }

    if (attempts.length === 0) throw new Error("No hay proveedor server-side configurado.");

    const deadline = Date.now() + TURN_BUDGET_MS;
    let lastError: unknown = null;
    const attemptedProviders: string[] = [];
    for (const attempt of attempts) {
      if (Date.now() >= deadline) break;
      if (isProviderCoolingDown(attempt.name)) continue;
      attemptedProviders.push(attempt.name);
      try {
        const startedAt = Date.now();
        const result = await requestProvider(attempt, messages, deadline);
        providerCooldownUntil.delete(attempt.name);
        console.info("[landing-assistant] provider success", {
          provider: attempt.name,
          providerAttempts: attemptedProviders.length,
          attemptedProviders,
          promptBudget,
          promptChars: promptBudget.totalInputChars,
          elapsedMs: Date.now() - startedAt,
          promptTokens: result.usage?.promptTokens,
          completionTokens: result.usage?.completionTokens,
          totalTokens: result.usage?.totalTokens,
        });
        return result;
      } catch (error) {
        lastError = error;
        const status = error instanceof ProviderRequestError ? error.status : undefined;
        const cooldown = cooldownForStatus(status);
        if (cooldown > 0) {
          providerCooldownUntil.set(attempt.name, Date.now() + cooldown);
        } else if (error instanceof Error && error.name === "AbortError") {
          providerCooldownUntil.set(attempt.name, Date.now() + RATE_LIMIT_COOLDOWN_MS);
        }
        console.warn(`[landing-assistant] ${attempt.name} no disponible.`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("No hay proveedor disponible.");
  });
