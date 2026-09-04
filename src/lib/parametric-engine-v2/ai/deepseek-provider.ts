import { validateSupervisorEvaluation } from "./guardrails";
import type { SupervisorEvaluation, SupervisorInput, SupervisorOutcome } from "./types";
import {
  fetchServerIntegration,
  getServerIntegrationSecret,
} from "@/server/integrations/server-fetch";

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com/chat/completions";

export interface DeepSeekOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

function apiKeyFromServer(options: DeepSeekOptions): string | null {
  const key = options.apiKey ?? getServerIntegrationSecret("DEEPSEEK_API_KEY");
  return key?.trim() || null;
}

function promptFor(input: SupervisorInput): string {
  return [
    "Review this Engine V2 media/template summary.",
    "Return JSON only with verdict, coherence_score (0-100), warnings (string[]), suggestions (allowlisted objects).",
    "Never return Power Editor fields, block types, URLs, CSS, executable code, or user facts.",
    JSON.stringify(input),
  ].join("\n");
}

function extractEvaluation(body: unknown): SupervisorEvaluation {
  const choices =
    body && typeof body === "object" ? (body as Record<string, unknown>)["choices"] : null;
  const first = Array.isArray(choices) ? choices[0] : null;
  const message =
    first && typeof first === "object" ? (first as Record<string, unknown>)["message"] : null;
  const content =
    message && typeof message === "object" ? (message as Record<string, unknown>)["content"] : null;
  if (typeof content !== "string") throw new Error("Invalid DeepSeek response");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("DeepSeek response was not JSON");
  }
  return validateSupervisorEvaluation(parsed);
}

/** One bounded call. It never mutates Engine or Power Editor configuration. */
export async function superviseWithDeepSeek(
  input: SupervisorInput,
  options: DeepSeekOptions = {},
): Promise<SupervisorOutcome> {
  const apiKey = apiKeyFromServer(options);
  if (!apiKey) return { status: "unavailable", evaluation: null, errorCode: "MISSING_API_KEY" };
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetchServerIntegration)(
      options.baseUrl ?? process.env["DEEPSEEK_BASE_URL"] ?? DEFAULT_DEEPSEEK_BASE_URL,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a strict semantic QA supervisor for a deterministic template engine.",
            },
            { role: "user", content: promptFor(input) },
          ],
        }),
      },
    );
  } catch {
    return { status: "unavailable", evaluation: null, errorCode: "REQUEST_FAILED" };
  }
  if (!response.ok) return { status: "unavailable", evaluation: null, errorCode: "REQUEST_FAILED" };
  try {
    const evaluation = extractEvaluation(await response.json());
    return { status: "available", evaluation };
  } catch {
    return { status: "unavailable", evaluation: null, errorCode: "INVALID_RESPONSE" };
  }
}
