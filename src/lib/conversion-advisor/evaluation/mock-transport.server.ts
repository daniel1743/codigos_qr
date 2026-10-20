/**
 * CRIPQER Conversion Advisor — CA-9A · the mock evaluation transport.
 *
 * SERVER-SIDE ONLY (`.server.ts`). This is the ONLY simulated thing in CA-9A. It
 * answers CA-1 with scripted HTTP responses and NEVER opens a socket, so the
 * whole evaluation path — CA-7.1B → CA-8 → CA-3 → CA-4 → CA-6 → CA-7.4-A — can
 * be exercised locally with `real_provider_authorized: false`.
 *
 * IT ANSWERS THE SHAPE, NOT THE QUESTION. It produces a schema-valid listening
 * payload and a schema-valid grounded reply, so the plumbing, the contract
 * validation, the scoring and the cost accounting can all be tested end to end.
 * It does NOT simulate the model's judgement: a run against this transport
 * proves the harness works, never that the advisor answers well. That proof
 * needs CA-9B and a real provider, and the report says so.
 *
 * THE REAL TRANSPORT IS A ONE-LINE SWAP. CA-9B replaces `fetchImpl` here with a
 * `fetch` bound to the real provider config; nothing else in the runner changes.
 * That is the seam the brief asks for: "que CA-9B solo cambie el transporte".
 */

import type { AdvisorDeps, AdvisorProviderConfig } from "../provider.server";

/** The marker that distinguishes a listening call from a commercial call. */
const LISTENING_MARKER = "comprensión de intenciones";

/** The grounded reply the mock hands back: valid, claim-free, within bounds. */
export const MOCK_REPLY =
  "CRIPQER reúne tu información y tus enlaces en una sola página con QR. ¿Quieres que te cuente cómo se ve?";

const MOCK_SIGNALS = {
  intents: ["DISCOVERY"],
  business_type: null,
  primary_goal: null,
  secondary_goals: [],
  expressed_needs: [],
  explicit_objections: [],
  current_tools: [],
  technical_familiarity: "UNKNOWN",
  purchase_readiness: "UNKNOWN",
  next_best_action: "EXPLAIN",
  confidence: 0.8,
  unknown_fields: [],
};

const USAGE_LISTEN = { prompt_tokens: 220, completion_tokens: 60 };
const USAGE_ADVISE = { prompt_tokens: 320, completion_tokens: 120 };

export interface MockTransportOptions {
  /** The reply the commercial call returns. Defaults to `MOCK_REPLY`. */
  readonly reply?: string;
  /** Signals the listening call returns. Defaults to a DISCOVERY payload. */
  readonly signals?: Record<string, unknown>;
  /** When true, omit the `usage` block — CA-3/CA-4 read that as UNKNOWN. */
  readonly omitUsage?: boolean;
  /** When set, every call fails with this HTTP status (a 5xx is retryable). */
  readonly failWithStatus?: number;
}

function okResponse(content: string, usage: Record<string, unknown> | null): Response {
  const body: Record<string, unknown> = { choices: [{ message: { content } }] };
  if (usage !== null) body["usage"] = usage;
  return new Response(JSON.stringify(body), { status: 200 });
}

/**
 * Builds the injected `fetchImpl`. It reads the outgoing body to tell a
 * listening call from a commercial one, exactly as a real transport would not
 * need to — the marker is present in the system prompt CA-3 sends.
 */
export function createMockTransport(options: MockTransportOptions = {}): typeof fetch {
  const reply = options.reply ?? MOCK_REPLY;
  const signals = options.signals ?? MOCK_SIGNALS;

  return (async (_input: unknown, init?: RequestInit) => {
    if (options.failWithStatus !== undefined) {
      return new Response(JSON.stringify({ error: "mock failure" }), {
        status: options.failWithStatus,
      });
    }

    let systemPrompt = "";
    try {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        messages?: Array<{ role?: string; content?: unknown }>;
      };
      systemPrompt = String(body.messages?.[0]?.content ?? "");
    } catch {
      systemPrompt = "";
    }

    const isListening = systemPrompt.includes(LISTENING_MARKER);
    if (isListening) {
      return okResponse(JSON.stringify(signals), options.omitUsage ? null : USAGE_LISTEN);
    }
    return okResponse(
      JSON.stringify({ reply, capability_ids: [], limitations: [] }),
      options.omitUsage ? null : USAGE_ADVISE,
    );
  }) as typeof fetch;
}

/** The fictional config a local run uses. The host is `.invalid` (RFC 2606). */
export const MOCK_CONFIG: AdvisorProviderConfig = {
  apiKey: "sk-ca9a-FICTIONAL-NOT-A-REAL-KEY",
  baseUrl: "https://ca9a.invalid/v1",
  model: "deepseek-flash",
  timeoutMs: 5_000,
  maxOutputTokens: 400,
  maxRetries: 0,
  retryBaseDelayMs: 1,
};

/** Deps wired to the mock transport, for a local evaluation run. */
export function mockDeps(options: MockTransportOptions = {}): AdvisorDeps {
  return { fetchImpl: createMockTransport(options), sleep: async () => {} };
}
