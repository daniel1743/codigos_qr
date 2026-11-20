import { respondLocal } from "./localProvider";
import type { AssistantProvider, AssistantRequest } from "./contracts";
import type { AgentAction } from "../types/cripqer";
import { askDeepSeekLandingAssistantFn } from "./server";
import { ensureLandingValue } from "./salesGuidance";
import { detectCommercialNeed } from "./commercialNeeds";
import { normalizeAssistantText } from "./responseText";

export const DEEPSEEK_PROVIDER_ID = "deepseek-sales";

/** Keeps the model's prose aligned with deterministic UI actions. */
export function alignTextWithActions(text: string, actions: AgentAction[]): string {
  const clean = text.trim();
  const recommendsTemplates = actions.some((action) => action.type === "RECOMMEND_TEMPLATES");
  const createsPage = actions.some((action) => action.type === "CREATE_PAGE");

  if (recommendsTemplates && !/plantilla|plantillas|te muestro|opciones|elige|elegir/i.test(clean)) {
    return `${clean}\n\nPara avanzar, te muestro estilos que encajan con tu objetivo. Elige uno y después podrás revisar y personalizar tu página.`;
  }
  if (createsPage && !/crear|prepar|publicar|editor/i.test(clean)) {
    return `${clean}\n\nYa tenemos lo necesario para pasar a la creación de tu página.`;
  }
  return clean;
}

/**
 * DeepSeek writes the conversational answer. The existing deterministic agent
 * remains the authority for UI actions and context patches, so model output can
 * never create a page or select a template by itself.
 */
export function createDeepSeekAssistantProvider(): AssistantProvider {
  return {
    id: DEEPSEEK_PROVIDER_ID,
    respond: async (request: AssistantRequest) => {
      const deterministic = respondLocal(request);
      const commercialNeed = request.intent.kind === "message"
        ? detectCommercialNeed(request.intent.text)
        : null;

      // These intents contain a product-fact boundary that must not be
      // reinterpreted by a model (WhatsApp contact is not native booking).
      // The deterministic response already contains the correct actions and
      // saves a paid call for a case with a verified answer.
      if (commercialNeed) {
        return {
          ...deterministic,
          metadata: {
            provider: DEEPSEEK_PROVIDER_ID,
            model: "deterministic-commercial-route",
            fallback: false,
          },
        };
      }
      try {
        const remote = await askDeepSeekLandingAssistantFn({ data: request });
        const aligned = normalizeAssistantText(alignTextWithActions(remote.text, deterministic.actions));
        return {
          ...deterministic,
          text: ensureLandingValue(
            aligned,
            request.intent.kind === "message" ? request.intent.text : "comparación de estilo",
          ),
          metadata: { provider: DEEPSEEK_PROVIDER_ID, model: remote.model, fallback: false },
        };
      } catch (error) {
        // Diagnostic only: keep production debugging useful without exposing
        // prompts, conversation history, provider keys, or request payloads.
        console.error('[landing-assistant] remote request failed', {
          provider: DEEPSEEK_PROVIDER_ID,
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : String(error),
        });
        return {
          ...deterministic,
          text: ensureLandingValue(
            deterministic.text,
            request.intent.kind === "message" ? request.intent.text : "",
          ),
          metadata: { provider: DEEPSEEK_PROVIDER_ID, model: null, fallback: true },
        };
      }
    },
  };
}
