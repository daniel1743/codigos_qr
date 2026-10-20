/**
 * CRIPQER Conversion Advisor — CA-7.4-B · the surface's own vocabulary.
 *
 * Two things are proved here, and both are about the surface rather than about
 * the pipeline:
 *
 *  · Every one of CA-7.4-A's six states has a label, and no two labels are the
 *    same. A label that read the same for two states would undo, at the last
 *    step, the entire reason for having six of them.
 *  · The one predicate that decides whether a visitor is offered a retry says
 *    yes only for a turn with no confirmed response, and it NARROWS while it
 *    does — which is what keeps `retry` from reading `retryText` off a union
 *    that also contains a visitor's entry.
 *
 * The fixtures below are the CONTRACT's own producers wherever a state can come
 * from one (`pendingAdvisorTurn`, `projectAdvisorTurn`, and the contract's own
 * notice table). Only `ANSWERED` needs a literal, because CA-7.4-A produces it
 * from a real turn and a turn is not what this file is testing; that literal is
 * pushed through `validateAdvisorUiResponse` so it cannot drift from the shape
 * it claims to be.
 */

import { describe, expect, it } from "vitest";

import {
  ADVISOR_UI_CONTRACT_VERSION,
  ADVISOR_UI_NOTICE_TEXTS,
  ADVISOR_UI_STATUSES,
  NOTICE_REQUIRED,
  OPEN_HELP_ACTION_ID,
  validateAdvisorUiResponse,
  type AdvisorUiNoticeCode,
  type AdvisorUiResponse,
  type AdvisorUiStatus,
} from "../../integration/ui-contract";
import { pendingAdvisorTurn, projectAdvisorTurn } from "../../integration/ui-projection";
import { SETTLED_NOTICE_CODES } from "../../integration/ui-state";
import {
  ADVISOR_ACTION_LABEL,
  ADVISOR_STATUS_LABEL,
  CONVERSATION_ROLES,
  DEFAULT_CONVERSATION_LABEL,
  ROLE_LABEL,
  isRetryable,
  type AdvisorEntry,
  type ConversationEntry,
  type VisitorEntry,
} from "../types";

const VISITOR: VisitorEntry = { id: "visitor-1", role: "VISITOR", text: "hola" };

/** A valid response for any of the six states, from the contract's own tables. */
function responseFor(status: AdvisorUiStatus): AdvisorUiResponse {
  if (status === "PROCESSING") return pendingAdvisorTurn();

  const noticeCode: AdvisorUiNoticeCode | null =
    status === "ANSWERED" ? null : SETTLED_NOTICE_CODES[status];
  const value = {
    version: ADVISOR_UI_CONTRACT_VERSION,
    status,
    message: "Mensaje de prueba.",
    notice:
      noticeCode === null ? null : { code: noticeCode, text: ADVISOR_UI_NOTICE_TEXTS[noticeCode] },
    actions: [],
    conversation: null,
  };

  const validation = validateAdvisorUiResponse(value);
  if (!validation.ok) {
    throw new Error(`CA7_4B_TEST: invalid fixture — ${validation.problems.join(", ")}`);
  }
  return value;
}

function advisor(status: AdvisorUiStatus, retryText: string | null = "hola"): AdvisorEntry {
  return { id: "advisor-2", role: "ADVISOR", response: responseFor(status), retryText };
}

describe("the state labels", () => {
  it("names exactly the contract's six states — no more, no fewer", () => {
    expect(Object.keys(ADVISOR_STATUS_LABEL).sort()).toEqual([...ADVISOR_UI_STATUSES].sort());
  });

  it("uses six DISTINCT labels, so no two states read alike", () => {
    const labels = Object.values(ADVISOR_STATUS_LABEL);
    expect(labels).toHaveLength(ADVISOR_UI_STATUSES.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("never labels a state with an empty string", () => {
    for (const status of ADVISOR_UI_STATUSES) {
      expect(ADVISOR_STATUS_LABEL[status].trim()).not.toBe("");
    }
  });

  it("labels every state the contract says needs a notice", () => {
    // The two tables come from different files on purpose — the contract decides
    // WHETHER a state carries a notice, this surface decides what it is called —
    // so a state that gained a notice without gaining a label is caught here.
    const withNotice = ADVISOR_UI_STATUSES.filter((status) => NOTICE_REQUIRED[status]);
    expect(withNotice).toEqual(["DEGRADED", "FALLBACK", "REFUSED", "ERROR"]);
    for (const status of withNotice) {
      expect(ADVISOR_STATUS_LABEL[status]).not.toBe(ADVISOR_STATUS_LABEL.ANSWERED);
    }
  });
});

describe("the action labels", () => {
  it("names exactly the contract's executable actions, with a non-empty label each", () => {
    expect(Object.keys(ADVISOR_ACTION_LABEL)).toEqual([OPEN_HELP_ACTION_ID]);
    for (const label of Object.values(ADVISOR_ACTION_LABEL)) {
      expect(label.trim()).not.toBe("");
    }
  });

  it("names the help action as help, not as a URL or a template", () => {
    expect(ADVISOR_ACTION_LABEL.OPEN_HELP.toLowerCase()).toContain("ayuda");
    expect(ADVISOR_ACTION_LABEL.OPEN_HELP).not.toContain("/");
  });
});

describe("the participant labels", () => {
  it("names both roles, with a label each", () => {
    expect([...CONVERSATION_ROLES].sort()).toEqual(["ADVISOR", "VISITOR"]);
    for (const role of CONVERSATION_ROLES) {
      expect(ROLE_LABEL[role].trim()).not.toBe("");
    }
  });

  it("distinguishes the two roles by their text, not by styling alone", () => {
    expect(ROLE_LABEL.VISITOR).not.toBe(ROLE_LABEL.ADVISOR);
  });

  it("gives the conversation region a neutral accessible name", () => {
    expect(DEFAULT_CONVERSATION_LABEL.trim()).not.toBe("");
  });
});

describe("isRetryable", () => {
  it("offers a retry for a turn with no confirmed response", () => {
    expect(isRetryable(advisor("ERROR"))).toBe(true);
  });

  it("offers no retry for a state that claims something happened", () => {
    for (const status of ADVISOR_UI_STATUSES) {
      if (status === "ERROR") continue;
      expect(isRetryable(advisor(status))).toBe(false);
    }
  });

  it("offers no retry for a visitor's own entry", () => {
    expect(isRetryable(VISITOR)).toBe(false);
  });

  it("offers no retry when there is nothing left to resend", () => {
    expect(isRetryable(advisor("ERROR", null))).toBe(false);
  });

  it("narrows the union, so the text to resend is reachable without a cast", () => {
    const entries: readonly ConversationEntry[] = [VISITOR, advisor("ERROR")];
    const retryable = entries.filter(isRetryable);

    // The predicate is what makes this line compile at all: on the bare union,
    // `retryText` is not a property of every member.
    expect(retryable.map((entry) => entry.retryText)).toEqual(["hola"]);
  });
});
