/**
 * CA-7.3A — the pure projection and the renderer.
 *
 * These tests hold the SECURITY BOUNDARY of the preview. A `TurnOutcome`
 * carries per-operation usage, latency, denial reasons and a session key; none
 * of that may reach a surface. The property asserted here is not "the mapping
 * handles the reasons I happened to think of" but "NO reason can come out the
 * other side", including one nobody has written yet.
 */

import { describe, expect, it } from "vitest";

import type { TurnOperationReport, TurnOutcome } from "../../integration/contract";
import type { AgentResponse } from "../../../../features/approved-chat-landing/types/cripqer";
import { escapeHtml, renderTranscriptHtml, renderTranscriptText } from "../render";
import {
  PREVIEW_NOTE,
  PREVIEW_STATUS_LABEL,
  VISITOR_STATUS_LABEL,
  advisorPreviewMessage,
  executableActions,
  hasExecutableActions,
  previewNoteFor,
  previewStatusFor,
  previewStatusLabel,
  refusedPreviewMessage,
  settledVisitorMessage,
  visitorPreviewMessage,
  type PreviewStatus,
} from "../view-model";

/* ============================== fixtures ================================ */

function report(patch: Partial<TurnOperationReport> = {}): TurnOperationReport {
  return {
    reservation: "GRANTED",
    denied_reason: null,
    usage: { status: "REPORTED", usage: { inputTokens: 200, outputTokens: 50 } },
    latency_ms: 5,
    attempts_reserved: 1,
    failure_reason: null,
    ...patch,
  };
}

function outcome(patch: Partial<TurnOutcome> = {}): TurnOutcome {
  return {
    session_id: "11111111-1111-4111-8111-111111111111",
    model: "deepseek-flash",
    response: {
      reply: "CRIPQER reúne tu información y tus enlaces en una sola página con QR.",
      detected_intents: ["DISCOVERY"],
      relevant_capability_ids: ["tarjetas_bio"],
      suggested_action: "EXPLAIN",
      confidence: 0.8,
      limitations: [],
      grounding_status: "GROUNDED",
    },
    degraded: false,
    degraded_reason: null,
    understanding: report(),
    commercial_advice: report(),
    latency_ms: { understanding: 5, commercial_advice: 5, total: 10 },
    session: { turns_used: 1, turns_remaining: 49 },
    persisted: true,
    ...patch,
  };
}

const AGENT_RESPONSE: AgentResponse = { text: "Texto adaptado.", actions: [] };

/** Every safe sentence the surface may ever show. */
const SAFE_NOTES: readonly string[] = Object.values(PREVIEW_NOTE);

/* ============================ classification =========================== */

describe("CA-7.3A — a turn's status is read from the outcome, not guessed", () => {
  it("a grounded, undegraded turn is ANSWERED and carries no note", () => {
    const value = outcome();
    expect(previewStatusFor(value)).toBe("ANSWERED");
    expect(previewNoteFor(value)).toBeNull();
  });

  it("a safe fallback is its own state, and is NOT called degraded", () => {
    const value = outcome({
      response: { ...outcome().response, reply: "…", grounding_status: "FALLBACK" },
    });
    expect(previewStatusFor(value)).toBe("FALLBACK");
    expect(previewNoteFor(value)).toBe(PREVIEW_NOTE.answerNotVerified);
  });

  it("a degraded turn is DEGRADED whatever its reason", () => {
    const value = outcome({ degraded: true, degraded_reason: "GUARD_DENIED:BUDGET_EXHAUSTED" });
    expect(previewStatusFor(value)).toBe("DEGRADED");
  });

  it("a degraded turn showing CA-4's safe reply says the advisor could not answer", () => {
    const value = outcome({
      degraded: true,
      degraded_reason: "UNDERSTANDING_FAILED:PROVIDER_TIMEOUT",
      response: { ...outcome().response, reply: "…", grounding_status: "FALLBACK" },
    });
    expect(previewNoteFor(value)).toBe(PREVIEW_NOTE.temporarilyUnavailable);
  });

  it("a degraded turn showing a grounded reply says only that the turn was unverified", () => {
    const value = outcome({
      degraded: true,
      degraded_reason: "UNDERSTANDING_FAILED:PROVIDER_TIMEOUT",
    });
    expect(previewNoteFor(value)).toBe(PREVIEW_NOTE.turnNotVerified);
  });

  it("an unconfigured provider is named as such, and makes no call", () => {
    const value = outcome({ degraded: true, degraded_reason: "PROVIDER_NOT_CONFIGURED" });
    expect(previewNoteFor(value)).toBe(PREVIEW_NOTE.notConfigured);
  });

  it("every rate-limit denial reads as 'wait a moment', never as a cause", () => {
    for (const reason of [
      "GUARD_DENIED:SESSION_RATE_LIMIT",
      "GUARD_DENIED:GLOBAL_RATE_LIMIT",
      "GUARD_DENIED:CONCURRENCY_LIMIT",
    ]) {
      expect(previewNoteFor(outcome({ degraded: true, degraded_reason: reason }))).toBe(
        PREVIEW_NOTE.tooManyRequests,
      );
    }
  });
});

describe("CA-7.3A — no internal diagnostic can reach the surface", () => {
  // The CA-8 denial vocabulary, the two failure prefixes CA-7.1B wraps around
  // it, and reasons nobody has written yet. The last group is the point: the
  // mapping must be TOTAL, not a list of known cases.
  const REASONS: readonly string[] = [
    "GUARD_DENIED:KILL_SWITCH",
    "GUARD_DENIED:CIRCUIT_OPEN",
    "GUARD_DENIED:CONCURRENCY_LIMIT",
    "GUARD_DENIED:SESSION_RATE_LIMIT",
    "GUARD_DENIED:GLOBAL_RATE_LIMIT",
    "GUARD_DENIED:BUDGET_EXHAUSTED",
    "GUARD_DENIED:GUARD_UNAVAILABLE",
    "UNDERSTANDING_FAILED:PROVIDER_TIMEOUT",
    "UNDERSTANDING_FAILED:PROVIDER_NETWORK",
    "UNDERSTANDING_FAILED:SCHEMA_INVALID",
    "UNDERSTANDING_FAILED:USAGE_UNKNOWN",
    "COMMERCIAL_FAILED:PROVIDER_TIMEOUT",
    "COMMERCIAL_FAILED:USAGE_UNKNOWN",
    "PROVIDER_NOT_CONFIGURED",
    "SOMETHING_ENTIRELY_NEW:REASON_WE_HAVE_NOT_WRITTEN_YET",
  ];

  it("the note is always one of the safe sentences, and never the reason", () => {
    for (const reason of REASONS) {
      const value = outcome({ degraded: true, degraded_reason: reason });
      const note = previewNoteFor(value);
      expect(note).not.toBeNull();
      expect(SAFE_NOTES).toContain(note);
      expect(note).not.toContain(reason);
      // No fragment of the vocabulary either: a partial leak is still a leak.
      for (const token of ["GUARD", "DENIED", "FAILED", "UNKNOWN", "LIMIT", "BUDGET", "CIRCUIT"]) {
        expect(note).not.toContain(token);
      }
    }
  });

  it("a null reason is still handled without inventing a cause", () => {
    const note = previewNoteFor(outcome({ degraded: true, degraded_reason: null }));
    expect(note).toBe(PREVIEW_NOTE.turnNotVerified);
  });

  it("every status has a label, and the table is exhaustive", () => {
    const statuses: readonly PreviewStatus[] = [
      "PROCESSING",
      "ANSWERED",
      "FALLBACK",
      "DEGRADED",
      "REFUSED",
    ];
    for (const status of statuses) {
      expect(typeof PREVIEW_STATUS_LABEL[status]).toBe("string");
      expect(PREVIEW_STATUS_LABEL[status].length).toBeGreaterThan(0);
      expect(typeof VISITOR_STATUS_LABEL[status]).toBe("string");
      expect(VISITOR_STATUS_LABEL[status].length).toBeGreaterThan(0);
    }
    expect(Object.keys(PREVIEW_STATUS_LABEL).sort()).toEqual([...statuses].sort());
    expect(Object.keys(VISITOR_STATUS_LABEL).sort()).toEqual([...statuses].sort());
  });

  it("a visitor's message is never labelled with the advisor's reply vocabulary", () => {
    // The bug this pins: both messages of a settled turn carry the SAME status,
    // so reading one table for both renders "Visitante · Respuesta del asesor".
    const statuses: readonly PreviewStatus[] = [
      "PROCESSING",
      "ANSWERED",
      "FALLBACK",
      "DEGRADED",
      "REFUSED",
    ];
    for (const status of statuses) {
      const visitor = previewStatusLabel("VISITOR", status);
      const advisor = previewStatusLabel("ADVISOR", status);
      expect(visitor).toBe(VISITOR_STATUS_LABEL[status]);
      expect(advisor).toBe(PREVIEW_STATUS_LABEL[status]);
      // The only status whose sentence is about the turn, not the reply, is
      // PROCESSING — and it is the same word for both roles.
      if (status !== "PROCESSING") expect(visitor).not.toBe(advisor);
    }
    expect(previewStatusLabel("VISITOR", "ANSWERED")).toBe("Enviado");
    expect(previewStatusLabel("VISITOR", "REFUSED")).toBe("No enviado");
  });
});

/* ============================== builders =============================== */

describe("CA-7.3A — the message builders", () => {
  it("a visitor message starts in PROCESSING and settles into the turn's outcome", () => {
    const pending = visitorPreviewMessage("v1", "Hola.");
    expect(pending.status).toBe("PROCESSING");
    expect(pending.role).toBe("VISITOR");
    expect(pending.actions).toEqual([]);

    const settled = settledVisitorMessage(pending, "ANSWERED");
    expect(settled.status).toBe("ANSWERED");
    expect(settled.text).toBe("Hola.");
    expect(settled.id).toBe("v1");
  });

  it("an advisor message copies the adapted text verbatim and adds no action", () => {
    const message = advisorPreviewMessage("a1", AGENT_RESPONSE, outcome());
    expect(message.text).toBe("Texto adaptado.");
    expect(message.role).toBe("ADVISOR");
    expect(message.actions).toEqual([]);
    expect(hasExecutableActions(message)).toBe(false);
  });

  it("an advisor message carries the adapter's actions through, empty or not", () => {
    // Not a hypothetical: if CA-7.2 ever produced an action, the view model must
    // SHOW it rather than silently swallow it — the emptiness is asserted here,
    // not assumed by the projection.
    const withAction: AgentResponse = {
      text: "x",
      actions: [{ type: "CREATE_PAGE" }],
    };
    const message = advisorPreviewMessage("a2", withAction, outcome());
    expect(message.actions).toEqual([{ type: "CREATE_PAGE" }]);
    expect(hasExecutableActions(message)).toBe(true);
  });

  it("a refusal uses CA-7.1B's own fixed sentence, and offers nothing", () => {
    const message = refusedPreviewMessage("a1", "Escribe un mensaje para continuar.");
    expect(message.status).toBe("REFUSED");
    expect(message.text).toBe("Escribe un mensaje para continuar.");
    expect(message.actions).toEqual([]);
    expect(message.note).toBeNull();
  });

  it("the transcript's actions are the union of its messages", () => {
    const messages = [
      visitorPreviewMessage("v1", "a"),
      advisorPreviewMessage("a1", AGENT_RESPONSE, outcome()),
      refusedPreviewMessage("a2", "b"),
    ];
    expect(executableActions(messages)).toEqual([]);
  });
});

/* ============================== rendering ============================== */

describe("CA-7.3A — the renderer invents nothing", () => {
  it("renders a transcript a reviewer can read", () => {
    const messages = [
      settledVisitorMessage(visitorPreviewMessage("v1", "¿Qué es CRIPQER?"), "ANSWERED"),
      advisorPreviewMessage("a1", AGENT_RESPONSE, outcome()),
    ];
    const text = renderTranscriptText(messages);
    expect(text).toContain("Visitante");
    expect(text).toContain("Asesor");
    expect(text).toContain("¿Qué es CRIPQER?");
    expect(text).toContain("Texto adaptado.");
  });

  it("labels a visitor's line as the visitor's, never with the reply's vocabulary", () => {
    // A regression this caught in review: both messages of a settled turn carry
    // the SAME status, so a renderer reading one table for both printed
    // "Visitante · Respuesta del asesor". Asserted on the rendered line, not on
    // the table, because the table being right is not the same as it being used.
    const messages = [
      settledVisitorMessage(visitorPreviewMessage("v1", "Hola."), "ANSWERED"),
      advisorPreviewMessage("a1", AGENT_RESPONSE, outcome()),
    ];
    const text = renderTranscriptText(messages);
    const html = renderTranscriptHtml(messages, "Preview");

    expect(text).toContain("[Visitante · Enviado]");
    expect(text).toContain("[Asesor · Respuesta del asesor]");
    expect(text).not.toContain("Visitante · Respuesta del asesor");
    expect(html).toContain("<header>Visitante · Enviado</header>");
    expect(html).not.toContain("Visitante · Respuesta del asesor");
  });

  it("renders the note beneath the message it explains", () => {
    const messages = [
      advisorPreviewMessage(
        "a1",
        AGENT_RESPONSE,
        outcome({ degraded: true, degraded_reason: "GUARD_DENIED:BUDGET_EXHAUSTED" }),
      ),
    ];
    const text = renderTranscriptText(messages);
    expect(text).toContain(PREVIEW_NOTE.turnNotVerified);
    expect(text).not.toContain("BUDGET_EXHAUSTED");
  });

  it("never emits a link, a button, a form or a script", () => {
    const messages = [
      settledVisitorMessage(
        visitorPreviewMessage("v1", "Visita https://ejemplo.invalid ya"),
        "ANSWERED",
      ),
      advisorPreviewMessage("a1", AGENT_RESPONSE, outcome()),
    ];
    const html = renderTranscriptHtml(messages, "Preview");
    for (const forbidden of [
      "<a ",
      "<a>",
      "href=",
      "<button",
      "<form",
      "<script",
      "<img",
      "onclick",
    ]) {
      expect(html.toLowerCase()).not.toContain(forbidden);
    }
  });

  it("escapes everything a visitor or the model could put on screen", () => {
    const hostile = '<script>alert("x")</script> & <img src=x onerror=y>';
    const messages = [settledVisitorMessage(visitorPreviewMessage("v1", hostile), "ANSWERED")];
    const html = renderTranscriptHtml(messages, "Preview");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(escapeHtml(hostile)).toContain("&amp;");
  });

  it("is a self-contained document: no external resource is referenced", () => {
    const html = renderTranscriptHtml([], "Preview");
    for (const forbidden of ["src=", "http://", "https://", "cdn.", "@import", "url("]) {
      expect(html).not.toContain(forbidden);
    }
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });
});
