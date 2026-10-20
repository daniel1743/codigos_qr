/**
 * CA-7.4-A — the public UI contract. PURE UNIT TESTS, no provider, no network.
 *
 * The contract is data and one validator, so the suite is mostly about the data
 * being CLOSED and DETERMINISTIC: an exhaustive table cannot quietly lose a
 * state, a notice text is looked up rather than assembled, and the validator
 * refuses the keys that would carry the server's bookkeeping to a browser.
 *
 * The valid fixture is written BY HAND, not produced by the projection, so this
 * suite pins the documented shape instead of agreeing with its own producer.
 * ui-projection.test.ts is where real outputs are validated.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ANSWER_LIMITS } from "../../advisor/response";
import {
  ADVISOR_UI_ACTION_KINDS,
  ADVISOR_UI_CONTRACT_VERSION,
  ADVISOR_UI_NOTICE_CODES,
  ADVISOR_UI_NOTICE_TEXTS,
  ADVISOR_UI_STATUSES,
  AUTHORISED_UI_ACTION_CATEGORIES,
  NOTICE_REQUIRED,
  OPEN_HELP_ACTION_ID,
  OPEN_HELP_DESTINATION,
  UI_ACTION_CATEGORIES,
  UI_LIMITS,
  validateAdvisorUiResponse,
  type AdvisorUiAction,
  type AdvisorUiNotice,
  type AdvisorUiNoticeCode,
  type AdvisorUiStatus,
} from "../ui-contract";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ============================== helpers ================================= */

/** Removes comments first: an import regex over raw source matches prose. */
function stripComments(source: string): string {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlocks
    .split("\n")
    .map((line) => {
      const index = line.indexOf("//");
      return index === -1 ? line : line.slice(0, index);
    })
    .join("\n");
}

const IMPORT_RE = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g;

function importSpecifiersOf(source: string): readonly string[] {
  return [...stripComments(source).matchAll(IMPORT_RE)].map((match) => match[3] ?? "");
}

/** Vocabulary that may never reach a visitor: internal markers and config. */
const INTERNAL_MARKERS: readonly string[] = [
  "respuesta_no_emitida",
  "GUARD_DENIED",
  "degraded_reason",
  "BUDGET_EXHAUSTED",
  "RATE_LIMIT",
  "KILL_SWITCH",
  "CIRCUIT_OPEN",
  "CONCURRENCY_LIMIT",
  "GUARD_UNAVAILABLE",
  "reservation",
  "latency",
  "attempts_reserved",
  "providerUsage",
  "DEEPSEEK",
  "API_KEY",
  "session_id",
];

/** A hand-written, valid projection. Every invalid case is a copy of this. */
function validResponse(): Record<string, unknown> {
  return {
    version: 1,
    status: "ANSWERED",
    message: "Cripqer crea páginas profesionales para tu negocio en segundos.",
    notice: null,
    actions: [],
    conversation: { turns_used: 3, turns_remaining: 47 },
  };
}

function withNotice(code: AdvisorUiNoticeCode): AdvisorUiNotice {
  return { code, text: ADVISOR_UI_NOTICE_TEXTS[code] };
}

/**
 * The contract's promised shape, written separately from the contract itself.
 *
 * The two types must be mutually assignable. Widening `AdvisorUiAction` (a
 * generic `href`, a second member) fails the second direction; narrowing it to
 * `never` fails the first. Either way `MutuallyAssignable<…> = true` stops
 * compiling, so a change to the union has to be deliberate.
 */
interface CanonicalAdvisorUiAction {
  readonly kind: "NAVIGATE_INTERNAL";
  readonly action_id: "OPEN_HELP";
  readonly destination: "/help";
}

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/* ============================== the suite =============================== */

describe("CA-7.4-A — the contract's closed sets", () => {
  it("declares version 1 as a literal", () => {
    expect(ADVISOR_UI_CONTRACT_VERSION).toBe(1);
  });

  it("names exactly the six states, PROCESSING first", () => {
    expect(ADVISOR_UI_STATUSES).toEqual([
      "PROCESSING",
      "ANSWERED",
      "DEGRADED",
      "FALLBACK",
      "REFUSED",
      "ERROR",
    ]);
  });

  it("classifies every state in NOTICE_REQUIRED, and only ANSWERED and PROCESSING go without", () => {
    const classified = Object.keys(NOTICE_REQUIRED).sort();
    expect(classified).toEqual([...ADVISOR_UI_STATUSES].sort());

    const withoutNotice: AdvisorUiStatus[] = [];
    for (const status of ADVISOR_UI_STATUSES) {
      if (!NOTICE_REQUIRED[status]) withoutNotice.push(status);
    }
    expect(withoutNotice).toEqual(["PROCESSING", "ANSWERED"]);
  });

  it("gives every notice code exactly one fixed sentence", () => {
    const coded = Object.keys(ADVISOR_UI_NOTICE_TEXTS).sort();
    expect(coded).toEqual([...ADVISOR_UI_NOTICE_CODES].sort());
    for (const code of ADVISOR_UI_NOTICE_CODES) {
      const text = ADVISOR_UI_NOTICE_TEXTS[code];
      expect(typeof text).toBe("string");
      expect(text.trim()).not.toBe("");
      expect(text.length).toBeLessThanOrEqual(UI_LIMITS.maxNoticeChars);
    }
  });

  it("keeps the eight notice sentences distinguishable from one another", () => {
    const texts = ADVISOR_UI_NOTICE_CODES.map((code) => ADVISOR_UI_NOTICE_TEXTS[code]);
    expect(new Set(texts).size).toBe(ADVISOR_UI_NOTICE_CODES.length);
  });

  it("never writes internal vocabulary into a notice", () => {
    for (const code of ADVISOR_UI_NOTICE_CODES) {
      const text = ADVISOR_UI_NOTICE_TEXTS[code];
      for (const marker of INTERNAL_MARKERS) {
        expect(text).not.toContain(marker);
      }
    }
  });

  it("mirrors CA-4's reply bound rather than importing it", () => {
    // `advisor/response.ts` reaches the provider by VALUE, so the number is
    // copied here and pinned: drift fails this test instead of shipping.
    expect(UI_LIMITS.maxMessageChars).toBe(ANSWER_LIMITS.maxReplyChars);
  });
});

describe("CA-10B — the action slot is closed to exactly one member", () => {
  it("is exactly NAVIGATE_INTERNAL · OPEN_HELP · /help at the TYPE level", () => {
    // If the union is widened (a generic `href`, a second member) or narrowed to
    // `never`, this line stops compiling.
    const closed: MutuallyAssignable<AdvisorUiAction, CanonicalAdvisorUiAction> = true;
    expect(closed).toBe(true);

    const member: AdvisorUiAction = {
      kind: "NAVIGATE_INTERNAL",
      action_id: "OPEN_HELP",
      destination: "/help",
    };
    expect(member.action_id).toBe(OPEN_HELP_ACTION_ID);
    expect(member.destination).toBe(OPEN_HELP_DESTINATION);
  });

  it("names exactly one executable kind", () => {
    expect(ADVISOR_UI_ACTION_KINDS).toEqual(["NAVIGATE_INTERNAL"]);
  });

  it("authorises NAVIGATE_INTERNAL and no other category", () => {
    expect(AUTHORISED_UI_ACTION_CATEGORIES).toEqual(["NAVIGATE_INTERNAL"]);
  });

  it("still NAMES the categories a later phase would have to authorise", () => {
    expect(UI_ACTION_CATEGORIES).toEqual([
      "INFORMATION",
      "NAVIGATION",
      "PRIVILEGED",
      "NAVIGATE_INTERNAL",
    ]);
  });
});

describe("CA-7.4-A — the contract file reaches nothing", () => {
  it("imports NOTHING at all", () => {
    const source = readFileSync(join(HERE, "..", "ui-contract.ts"), "utf8");
    expect(importSpecifiersOf(source)).toEqual([]);
  });
});

describe("CA-7.4-A — validateAdvisorUiResponse", () => {
  it("accepts a valid projection", () => {
    const verdict = validateAdvisorUiResponse(validResponse());
    expect(verdict).toEqual({ ok: true, problems: [] });
  });

  it("accepts a PROCESSING projection, which carries no notice and no counts", () => {
    const verdict = validateAdvisorUiResponse({
      version: 1,
      status: "PROCESSING",
      message: "Estamos preparando tu respuesta.",
      notice: null,
      actions: [],
      conversation: null,
    });
    expect(verdict.ok).toBe(true);
  });

  it("refuses anything that is not an object", () => {
    for (const value of [null, undefined, 42, "text", [], true]) {
      expect(validateAdvisorUiResponse(value).ok).toBe(false);
    }
  });

  it("refuses an unknown key at the top level — nothing rides along", () => {
    const extra = { ...validResponse(), session_id: "3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b" };
    const verdict = validateAdvisorUiResponse(extra);
    expect(verdict.ok).toBe(false);
    expect(verdict.problems).toContain("unknown_key:session_id");
  });

  it("refuses an unknown key inside the notice and inside the conversation", () => {
    const inNotice = {
      ...validResponse(),
      notice: { ...withNotice("TURN_INCOMPLETE"), severity: "x" },
    };
    expect(validateAdvisorUiResponse(inNotice).problems).toContain("unknown_notice_key:severity");

    const inConversation = {
      ...validResponse(),
      conversation: { turns_used: 1, turns_remaining: 49, session_key: "advisor:abc" },
    };
    expect(validateAdvisorUiResponse(inConversation).problems).toContain(
      "unknown_conversation_key:session_key",
    );
  });

  it("refuses a foreign version", () => {
    expect(validateAdvisorUiResponse({ ...validResponse(), version: 2 }).problems).toContain(
      "bad_version",
    );
  });

  it("refuses an empty or oversized message, and never echoes it", () => {
    const empty = validateAdvisorUiResponse({ ...validResponse(), message: "   " });
    expect(empty.problems).toContain("empty_message");

    const long = "x".repeat(UI_LIMITS.maxMessageChars + 1);
    const oversized = validateAdvisorUiResponse({ ...validResponse(), message: long });
    expect(oversized.problems).toContain("message_too_long");
    expect(JSON.stringify(oversized)).not.toContain(long);
  });

  it("accepts the ONE canonical action", () => {
    const canonical = {
      ...validResponse(),
      actions: [{ kind: "NAVIGATE_INTERNAL", action_id: "OPEN_HELP", destination: "/help" }],
    };
    expect(validateAdvisorUiResponse(canonical)).toEqual({ ok: true, problems: [] });
  });

  it("refuses every destination that is not exactly /help", () => {
    for (const destination of [
      "/pages",
      "https://example.com",
      "http://example.com/help",
      "//evil.test",
      "javascript:alert(1)",
      "data:text/html,x",
      "blob:https://evil.test/x",
      "../help",
      "/%2e%2e/help",
      "/help?next=https://evil.test",
      "/help#x",
    ]) {
      const verdict = validateAdvisorUiResponse({
        ...validResponse(),
        actions: [{ kind: "NAVIGATE_INTERNAL", action_id: "OPEN_HELP", destination }],
      });
      expect(verdict.ok, destination).toBe(false);
      expect(verdict.problems, destination).toContain("bad_action_destination");
    }
  });

  it("refuses a tampered kind or action id", () => {
    expect(
      validateAdvisorUiResponse({
        ...validResponse(),
        actions: [{ kind: "NAVIGATE", action_id: "OPEN_HELP", destination: "/help" }],
      }).problems,
    ).toContain("bad_action_kind");

    expect(
      validateAdvisorUiResponse({
        ...validResponse(),
        actions: [{ kind: "NAVIGATE_INTERNAL", action_id: "CREATE_PAGE", destination: "/help" }],
      }).problems,
    ).toContain("bad_action_id");
  });

  it("refuses an action carrying an unknown key — a generic href never rides along", () => {
    const verdict = validateAdvisorUiResponse({
      ...validResponse(),
      actions: [
        {
          kind: "NAVIGATE_INTERNAL",
          action_id: "OPEN_HELP",
          destination: "/help",
          href: "https://evil.test",
        },
      ],
    });
    expect(verdict.problems).toContain("unknown_action_key:href");
  });

  it("refuses a second action: the closed set has exactly one", () => {
    const action = { kind: "NAVIGATE_INTERNAL", action_id: "OPEN_HELP", destination: "/help" };
    expect(
      validateAdvisorUiResponse({ ...validResponse(), actions: [action, action] }).problems,
    ).toContain("too_many_actions");
  });

  it("requires a notice for every state but ANSWERED and PROCESSING", () => {
    for (const status of ADVISOR_UI_STATUSES) {
      const missing = validateAdvisorUiResponse({ ...validResponse(), status, notice: null });
      expect(missing.problems.includes("missing_notice")).toBe(NOTICE_REQUIRED[status]);
    }
  });

  it("refuses a notice on a state that must not carry one", () => {
    const answered = { ...validResponse(), notice: withNotice("TURN_INCOMPLETE") };
    expect(validateAdvisorUiResponse(answered).problems).toContain("unexpected_notice");
  });

  it("refuses a notice whose text is not the table's for its code", () => {
    const assembled = { ...validResponse(), notice: { code: "TURN_INCOMPLETE", text: "algo" } };
    expect(validateAdvisorUiResponse(assembled).problems).toContain(
      "notice_text_not_deterministic:TURN_INCOMPLETE",
    );
  });

  it("refuses an unknown notice code", () => {
    const unknown = { ...validResponse(), notice: { code: "SOMETHING_NEW", text: "algo" } };
    expect(validateAdvisorUiResponse(unknown).problems).toContain("bad_notice_code");
  });

  it("refuses counts that are not non-negative integers", () => {
    for (const bad of [-1, 1.5, "3", null]) {
      const verdict = validateAdvisorUiResponse({
        ...validResponse(),
        conversation: { turns_used: bad, turns_remaining: 49 },
      });
      expect(verdict.problems).toContain("bad_count:turns_used");
    }
  });

  it("accepts a refusal that carries no counts, and one that does", () => {
    const withoutCounts = {
      ...validResponse(),
      status: "REFUSED",
      message: "No pudimos atender este mensaje tal como llegó.",
      notice: withNotice("INPUT_REFUSED"),
      conversation: null,
    };
    expect(validateAdvisorUiResponse(withoutCounts).ok).toBe(true);

    const withCounts = { ...withoutCounts, conversation: { turns_used: 7, turns_remaining: 43 } };
    expect(validateAdvisorUiResponse(withCounts).ok).toBe(true);
  });
});
