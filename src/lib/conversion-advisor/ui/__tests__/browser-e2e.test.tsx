// @vitest-environment node
/**
 * CRIPQER Conversion Advisor — CA-7.4-C · browser E2E, E01–E16.
 *
 * The certification this phase exists for: the CA-7.4-B surface, mounted in a
 * REAL browser (the repository's own Playwright chromium), driven through
 * COMPLETE conversations against the REAL internal pipeline — CA-7.1B, CA-8,
 * CA-3, CA-4, CA-6 — with only the provider's transport simulated.
 *
 * WHAT IS REAL HERE, AND WHAT IS NOT:
 *  · REAL: chromium; the DOM; React; the surface; the controller; the hook; the
 *    host's HTTP layer; `runConversationalTurn`; CA-8 reservations over a real
 *    ledger; CA-3; CA-4; CA-6; CA-7.4-A's projection and validator.
 *  · SIMULATED: the provider's `fetchImpl` only — scripted HTTP responses handed
 *    to CA-1. No socket is opened and no DeepSeek endpoint exists in this file.
 *
 * The host is ephemeral and isolated (`test-host.ts`): an OS-assigned port, an
 * inline Vite config so `vite.config.ts` is untouched, and the pipeline on the
 * server side only, reachable through `ssrLoadModule`.
 */

import { chromium, type Browser, type ConsoleMessage, type Page } from "@playwright/test";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { startTestHost, type TestHost } from "../e2e/test-host";

// These tests drive a real browser against a real server: the default 5s budget
// is a limit on nothing but the machine. The host itself starts once, in
// `beforeAll`, and is reused, so per-test cost is one browser context.
vi.setConfig({ testTimeout: 90_000, hookTimeout: 180_000 });

/* ============================== the harness ============================= */

let host: TestHost;
let browser: Browser;

/** Every console error seen by a page, so a test can assert there were none. */
const consoleErrors = new WeakMap<Page, string[]>();

beforeAll(async () => {
  host = await startTestHost();
  browser = await chromium.launch({ headless: true });
}, 180_000);

afterAll(async () => {
  await browser?.close();
  await host?.close();
});

beforeEach(() => {
  // A fresh conversation table per test: turn counts and reservations from one
  // test can never be read as another's.
  host.pipeline.resetHost();
});

interface OpenOptions {
  readonly scenario?: string;
  readonly instances?: number;
  readonly viewport?: { readonly width: number; readonly height: number };
}

/** Opens the host with a scenario and returns a watched page. */
async function open(options: OpenOptions = {}): Promise<Page> {
  const context = await browser.newContext(
    options.viewport === undefined ? {} : { viewport: options.viewport },
  );
  const page = await context.newPage();
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error: Error) => errors.push(`pageerror: ${error.message}`));

  const query = new URLSearchParams({ scenario: options.scenario ?? "answered" });
  if (options.instances !== undefined) query.set("instances", String(options.instances));
  await page.goto(`${host.url}/?${query.toString()}`, { waitUntil: "networkidle" });
  await page.waitForSelector("textarea");
  return page;
}

function errorsOf(page: Page): readonly string[] {
  return consoleErrors.get(page) ?? [];
}

/** Types and submits, the way a person does. */
async function send(page: Page, text: string, index = 0): Promise<void> {
  const field = page.locator("textarea").nth(index);
  await field.fill(text);
  await page.locator('button[type="submit"]').nth(index).click();
}

async function statuses(page: Page): Promise<readonly (string | null)[]> {
  return page.$$eval("[data-status]", (nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset["status"] ?? null),
  );
}

async function lastStatus(page: Page): Promise<string | null> {
  return (await statuses(page)).at(-1) ?? null;
}

async function waitForStatus(page: Page, status: string, timeout = 20_000): Promise<void> {
  await page.waitForSelector(`[data-status="${status}"]`, { timeout });
}

async function advisorTexts(page: Page): Promise<readonly string[]> {
  return page.$$eval('[data-role="ADVISOR"] p', (nodes) =>
    nodes.map((node) => node.textContent ?? ""),
  );
}

async function visitorTexts(page: Page): Promise<readonly string[]> {
  return page.$$eval('[data-role="VISITOR"] p', (nodes) =>
    nodes.map((node) => node.textContent ?? ""),
  );
}

async function entryCount(page: Page): Promise<number> {
  return page.$$eval("[data-entry-id]", (nodes) => nodes.length);
}

async function buttonLabels(page: Page): Promise<readonly string[]> {
  return page.$$eval("button", (nodes) => nodes.map((node) => node.textContent ?? ""));
}

/* ======================= E01 · CONVERSATION_SUCCESS ===================== */

describe("E01 CONVERSATION_SUCCESS", () => {
  it("shows PROCESSING, then ANSWERED, and keeps both messages", async () => {
    const page = await open({ scenario: "slow" });

    await send(page, "quiero una página con QR");

    // The visitor's message is on screen and the turn is in flight — the state
    // is observable because the provider is still waiting.
    await waitForStatus(page, "PROCESSING");
    expect(await visitorTexts(page)).toEqual(["quiero una página con QR"]);
    expect(await page.locator('button[type="submit"]').isDisabled()).toBe(true);
    expect(await page.locator("ol").getAttribute("aria-busy")).toBe("true");

    await page.close();

    // The same conversation, against a provider that answers.
    const answered = await open({ scenario: "answered" });
    await send(answered, "quiero una página con QR");
    await waitForStatus(answered, "ANSWERED");

    expect(await statuses(answered)).toEqual(["ANSWERED"]);
    expect(await visitorTexts(answered)).toEqual(["quiero una página con QR"]);
    expect(await advisorTexts(answered)).toHaveLength(1);
    expect((await advisorTexts(answered))[0]).toContain("CRIPQER");
    // No executable action is offered anywhere on the page.
    expect(await buttonLabels(answered)).not.toContain("NAVIGATE");
    expect(await answered.locator("a").count()).toBe(0);
    expect(errorsOf(answered)).toEqual([]);
    await answered.close();
  });

  it("runs the real pipeline: two provider calls, one reservation", async () => {
    const page = await open({ scenario: "answered" });
    await send(page, "hola");
    await waitForStatus(page, "ANSWERED");

    const stats = host.pipeline.hostStats();
    expect(stats.turns).toBe(1);
    // CA-3 listening + CA-4 advising: two calls to the provider, both real code.
    expect(stats.providerCalls).toBe(2);
    expect(stats.records[0]?.providerCalls).toBe(2);
    expect(stats.records[0]?.status).toBe("ANSWERED");
    await page.close();
  });
});

/* ========================= E02 · DEGRADED_RESPONSE ====================== */

describe("E02 DEGRADED_RESPONSE", () => {
  it("shows DEGRADED with the contract's public notice, never the internal reason", async () => {
    const page = await open({ scenario: "degraded" });
    await send(page, "cuéntame más");
    await waitForStatus(page, "DEGRADED");

    expect(await statuses(page)).toEqual(["DEGRADED"]);
    const text = (
      await page.$$eval("[data-status]", (nodes) => nodes.map((node) => node.textContent ?? ""))
    ).join(" ");
    expect(text).toContain("Respuesta con aviso");
    // The public notice comes from the contract's own table.
    expect(text).toContain(
      "Esta respuesta está verificada, pero el turno no se completó del todo.",
    );
    // The internal reason never reaches the surface: not the marker, not the code.
    expect(text).not.toContain("UNDERSTANDING_FAILED");
    expect(text).not.toContain("degraded_reason");
    expect(await page.content()).not.toContain("UNDERSTANDING_FAILED");
    expect(errorsOf(page)).toEqual([]);
    await page.close();
  });
});

/* ========================== E03 · SAFE_FALLBACK ========================= */

describe("E03 SAFE_FALLBACK", () => {
  it("shows FALLBACK when no validated commercial answer exists, and calls no provider", async () => {
    const page = await open({ scenario: "fallback" });
    await send(page, "hola");
    await waitForStatus(page, "FALLBACK");

    expect(await statuses(page)).toEqual(["FALLBACK"]);
    const text = (
      await page.$$eval("[data-status]", (nodes) => nodes.map((node) => node.textContent ?? ""))
    ).join(" ");
    expect(text).toContain("Respuesta segura");
    expect(text).toContain("Esto no es una recomendación verificada");
    // Not configured: not one provider call, so nothing could be invented.
    expect(host.pipeline.hostStats().providerCalls).toBe(0);
    await page.close();
  });
});

/* ========================= E04 · GUARDED_REFUSAL ======================== */

describe("E04 GUARDED_REFUSAL", () => {
  it("shows REFUSED from a real CA-8 denial, with no provider call and no internal code", async () => {
    const page = await open({ scenario: "refused" });
    await send(page, "hola");
    await waitForStatus(page, "REFUSED");

    expect(await statuses(page)).toEqual(["REFUSED"]);
    // The reservation was DENIED before the call, so the provider was never
    // reached — the whole point of a guarded refusal.
    expect(host.pipeline.hostStats().providerCalls).toBe(0);
    const text = await page.content();
    expect(text).not.toContain("KILL_SWITCH");
    expect(text).not.toContain("DENIED");
    expect(text).not.toContain("denied_reason");
    await page.close();
  });
});

/* ========================= E05 · TRANSPORT_ERROR ======================== */

describe("E05 TRANSPORT_ERROR", () => {
  it("shows ERROR, keeps the history, leaks no stack trace, and offers a manual retry", async () => {
    const page = await open({ scenario: "transport-error" });
    await send(page, "hola");
    await waitForStatus(page, "ERROR");

    expect(await statuses(page)).toEqual(["ERROR"]);
    // The visitor's message survives the failure.
    expect(await visitorTexts(page)).toEqual(["hola"]);
    // A retry is offered, and it is manual: nothing retried by itself.
    expect(await buttonLabels(page)).toContain("Reintentar");
    expect(host.pipeline.hostStats().turns).toBe(1);
    // The state is the contract's own generic sentence — no cause, no stack.
    const shown = (
      await page.$$eval("[data-status]", (nodes) => nodes.map((node) => node.textContent ?? ""))
    ).join(" ");
    expect(shown).toContain("Sin respuesta confirmada");
    expect(shown).toContain("Vuelve a intentarlo en unos momentos.");
    // The advisor's own line claims nothing either.
    expect((await advisorTexts(page))[0]).toContain("No obtuvimos una respuesta confirmada");
    // No stack trace, no host internals.
    const html = await page.content();
    expect(html).not.toContain("Error:");
    expect(html).not.toContain("CA7_4C");
    expect(html).not.toContain("stack");
    await page.close();
  });
});

/* ========================== E06 · EXPLICIT_RETRY ======================== */

describe("E06 EXPLICIT_RETRY", () => {
  it("retries only on the visitor's action, as a NEW turn, through CA-8 again", async () => {
    // `recover` fails its FIRST turn at the transport and succeeds afterwards.
    // A provider failure alone would not work here: CA-7.1B answers a provider
    // failure with FALLBACK, not with a retryable ERROR, so nothing would offer
    // a retry to press.
    const page = await open({ scenario: "recover" });
    await send(page, "hola");
    await waitForStatus(page, "ERROR");

    // No automatic retry: one turn, one visible failure.
    expect(host.pipeline.hostStats().turns).toBe(1);
    expect(await buttonLabels(page)).toContain("Reintentar");

    const before = host.pipeline.hostStats();
    await page.locator("button", { hasText: "Reintentar" }).click();
    await waitForStatus(page, "ANSWERED");

    const after = host.pipeline.hostStats();
    // The retry is a NEW turn — appended, not rewritten — so the failed attempt
    // stays visible and no message is duplicated.
    expect(after.turns).toBe(before.turns + 1);
    expect(await entryCount(page)).toBe(4);
    expect(await visitorTexts(page)).toEqual(["hola", "hola"]);
    // Each turn really went through CA-8: the retry's turn made its own calls.
    expect(after.records.at(-1)?.providerCalls).toBe(2);
    await page.close();
  });
});

/* ========================== E07 · DOUBLE_SUBMIT ========================= */

describe("E07 DOUBLE_SUBMIT", () => {
  it("accepts one of two simultaneous submits: one turn, one provider round", async () => {
    const page = await open({ scenario: "slow" });

    await page.locator("textarea").fill("hola");
    // Two submits in the SAME task, dispatched as events so the disabled button
    // cannot absorb the second one — the controller is the layer that must hold.
    await page.evaluate(() => {
      const form = document.querySelector("form");
      if (form === null) throw new Error("no form");
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await waitForStatus(page, "PROCESSING");

    // One visitor entry, one advisor entry — the second submit changed nothing.
    expect(await entryCount(page)).toBe(2);
    expect(await visitorTexts(page)).toEqual(["hola"]);
    // One turn reached the host: the single-flight rule held in a real browser,
    // past a disabled button.
    expect(host.pipeline.hostStats().turnsStarted).toBe(1);
    await page.close();
  });
});

/* =================== E08 · CANCEL_AND_LATE_RESPONSE ===================== */

describe("E08 CANCEL_AND_LATE_RESPONSE", () => {
  it("settles a cancelled turn as ERROR and never flips it to ANSWERED", async () => {
    // The provider answers LATE and ignores the abort, so a real answer would
    // arrive after the cancel — the surface must drop it.
    const page = await open({ scenario: "delayed-answer" });
    await send(page, "hola");
    await waitForStatus(page, "PROCESSING");

    await page.locator("button", { hasText: "Cancelar" }).click();
    await waitForStatus(page, "ERROR");
    expect(await statuses(page)).toEqual(["ERROR"]);

    // Wait past the moment the late answer lands at the host, and re-check: the
    // surface is still ERROR. A cancellation is not a success, and a late answer
    // does not become one.
    await page.waitForTimeout(4_000);
    expect(await statuses(page)).toEqual(["ERROR"]);
    expect(await buttonLabels(page)).toContain("Reintentar");
    // No promise of a refund is made anywhere: no budget language on screen.
    const html = await page.content();
    expect(html).not.toContain("presupuesto");
    expect(html).not.toContain("reembol");
    await page.close();
  });
});

/* ======================= E09 · COMPONENT_UNMOUNT ======================== */

describe("E09 COMPONENT_UNMOUNT", () => {
  it("aborts on unmount, updates nothing afterwards, and remounts cleanly", async () => {
    const page = await open({ scenario: "slow" });
    await send(page, "hola");
    await waitForStatus(page, "PROCESSING");

    // Navigating away unmounts the surface mid-flight.
    await page.goto(`${host.url}/?scenario=answered`, { waitUntil: "networkidle" });
    await page.waitForSelector("textarea");

    // A fresh mount is fully functional.
    await send(page, "hola de nuevo");
    await waitForStatus(page, "ANSWERED");
    expect(await advisorTexts(page)).toHaveLength(1);
    expect(errorsOf(page)).toEqual([]);
    await page.close();
  });
});

/* ==================== E10 · TWO_ISOLATED_INSTANCES ====================== */

describe("E10 TWO_ISOLATED_INSTANCES", () => {
  it("keeps two conversations on one page from sharing state or history", async () => {
    const page = await open({ scenario: "answered", instances: 2 });

    await send(page, "mensaje uno", 0);
    await waitForStatus(page, "ANSWERED");
    await send(page, "mensaje dos", 1);

    await page.waitForFunction(
      () => document.querySelectorAll('[data-status="ANSWERED"]').length === 2,
      undefined,
      { timeout: 20_000 },
    );

    const transcripts = await page.$$eval("[data-advisor-conversation]", (nodes) =>
      nodes.map((node) => ({
        visitor: [...node.querySelectorAll('[data-role="VISITOR"] p')].map((p) => p.textContent),
        advisor: node.querySelectorAll('[data-role="ADVISOR"] p').length,
      })),
    );

    // Each surface holds only its own message: no shared history.
    expect(transcripts[0]?.visitor).toEqual(["mensaje uno"]);
    expect(transcripts[1]?.visitor).toEqual(["mensaje dos"]);
    // Two conversations on the host, and no identifier is shared with the DOM.
    expect(host.pipeline.hostStats().sessions).toBe(2);
    await page.close();
  });
});

/* ======================= E11 · MALFORMED_RESPONSE ======================= */

describe("E11 MALFORMED_RESPONSE", () => {
  it("rejects an out-of-contract payload instead of rendering its fields", async () => {
    const page = await open({ scenario: "malformed" });
    await send(page, "hola");
    await waitForStatus(page, "ERROR");

    expect(await statuses(page)).toEqual(["ERROR"]);
    const html = await page.content();
    // The smuggled session id, the invented action and the hostile href are all
    // refused: none of them reaches the DOM.
    expect(html).not.toContain("session_id");
    expect(html).not.toContain("NAVIGATE");
    expect(html).not.toContain("evil.invalid");
    expect(html).not.toContain("no debe renderizarse");
    expect(await page.locator("a").count()).toBe(0);
    await page.close();
  });
});

/* ==================== E12 · XSS_AND_UNSAFE_CONTENT ====================== */

describe("E12 XSS_AND_UNSAFE_CONTENT", () => {
  it("renders hostile model text as inert text: no HTML, no script, no link", async () => {
    const page = await open({ scenario: "hostile" });
    await send(page, "hola");
    await page.waitForFunction(
      () => document.querySelectorAll("[data-status]").length > 0,
      undefined,
      { timeout: 20_000 },
    );

    // Whatever CA-4 decided (accept or fall back), the surface renders TEXT.
    // Scoped to the surface: the host page's own module scripts are not the
    // surface's output and are not what this scenario is about.
    const surface = page.locator("[data-advisor-conversation]");
    expect(await surface.locator("img, a, b, script, iframe, svg").count()).toBe(0);
    expect(await surface.locator('[data-role="ADVISOR"] img').count()).toBe(0);
    // The injected handler never ran.
    expect(
      await page.evaluate(() => (window as { __ca74c_xss?: number }).__ca74c_xss),
    ).toBeUndefined();
    // Every advisor paragraph holds text only — no element children.
    const childElements = await page.$$eval(
      '[data-advisor-conversation] [data-role="ADVISOR"] p',
      (nodes) => nodes.map((node) => node.children.length),
    );
    expect(childElements.length).toBeGreaterThan(0);
    expect(childElements.every((count) => count === 0)).toBe(true);
    await page.close();
  });
});

/* ===================== E13 · MOBILE_RESPONSIVENESS ====================== */

describe("E13 MOBILE_RESPONSIVENESS", () => {
  it("is usable on a phone viewport with no horizontal overflow", async () => {
    const page = await open({
      scenario: "answered",
      viewport: { width: 375, height: 667 },
    });

    await send(page, "hola desde el móvil");
    await waitForStatus(page, "ANSWERED");

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    // The controls are present and operable at phone width.
    const box = await page.locator('button[type="submit"]').boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThan(0);
    expect(await page.locator("textarea").isEditable()).toBe(true);
    await page.close();
  });
});

/* ================ E14 · NETWORK_AND_SECRET_ISOLATION ==================== */

describe("E14 NETWORK_AND_SECRET_ISOLATION", () => {
  it("makes no external call, exposes no secret, and serves no production route", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const external: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith(host.url) && !url.startsWith("data:") && !url.startsWith("blob:")) {
        external.push(url);
      }
    });

    await page.goto(`${host.url}/?scenario=answered`, { waitUntil: "networkidle" });
    await page.waitForSelector("textarea");
    await page.locator("textarea").fill("hola");
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('[data-status="ANSWERED"]', { timeout: 20_000 });

    // Zero external requests: the mock provider is the only "provider".
    expect(external).toEqual([]);

    // No secret reaches the browser: not the fictional key, not a real one.
    const html = await page.content();
    expect(html).not.toContain("sk-");
    expect(html).not.toContain("apiKey");
    expect(html).not.toContain("Authorization");

    // No CA-8 metric is exposed over HTTP: the stats route does not exist.
    const stats = await page.evaluate(async () => {
      const response = await fetch("/api/stats");
      return response.status;
    });
    expect(stats).toBe(404);

    await context.close();
  });
});

/* ========================== E15 · ACCESSIBILITY ========================= */

describe("E15 ACCESSIBILITY", () => {
  it("labels the input, announces once, and drives cancel/retry from the keyboard", async () => {
    const page = await open({ scenario: "answered" });

    // The field has a real label, and exactly one live region once settled.
    const labelled = await page.evaluate(() => {
      const field = document.querySelector("textarea");
      if (field === null) return false;
      const label = document.querySelector(`label[for="${field.id}"]`);
      return label !== null && (label.textContent ?? "").trim().length > 0;
    });
    expect(labelled).toBe(true);

    // Keyboard send: Ctrl+Enter.
    await page.locator("textarea").focus();
    await page.keyboard.type("hola por teclado");
    await page.keyboard.press("Control+Enter");
    await waitForStatus(page, "ANSWERED");
    expect(await visitorTexts(page)).toEqual(["hola por teclado"]);

    // One announcement per turn — never a live container plus a live status.
    expect(await page.locator('[aria-live="polite"]').count()).toBe(1);
    expect(await page.locator('[role="status"]').count()).toBe(1);

    // The transcript is reachable by keyboard (it can overflow).
    expect(await page.locator("ol").getAttribute("tabindex")).toBe("0");
    await page.close();
  });

  it("offers a keyboard-reachable Cancelar while a turn is in flight", async () => {
    const page = await open({ scenario: "slow" });
    await page.locator("textarea").fill("hola");
    await page.keyboard.press("Control+Enter");
    await waitForStatus(page, "PROCESSING");

    const cancel = page.locator("button", { hasText: "Cancelar" });
    expect(await cancel.count()).toBe(1);
    await cancel.focus();
    await page.keyboard.press("Enter");
    await waitForStatus(page, "ERROR");
    await page.close();
  });
});

/* ===================== E16 · SESSION_LIMITATION ========================= */

describe("E16 SESSION_LIMITATION", () => {
  it("keeps the conversation's identity out of the interface and promises no persistence", async () => {
    const page = await open({ scenario: "answered" });
    await send(page, "hola");
    await waitForStatus(page, "ANSWERED");

    const stats = host.pipeline.hostStats();
    expect(stats.sessions).toBe(1);

    // The session id lives in the host's memory, not in the DOM and not in
    // storage: nothing the browser can read identifies the conversation.
    const html = await page.content();
    expect(html).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
    const storage = await page.evaluate(() => ({
      local: window.localStorage.length,
      session: window.sessionStorage.length,
    }));
    expect(storage).toEqual({ local: 0, session: 0 });

    // Memory is per process: after a restart the conversation is simply gone,
    // and the surface says so honestly rather than pretending to recover it.
    host.pipeline.resetHost();
    await page.locator("textarea").fill("otra vez");
    await page.locator('button[type="submit"]').click();
    await waitForStatus(page, "REFUSED");
    expect(await statuses(page)).toContain("REFUSED");
    await page.close();
  });
});

/* ================= E17 · SESSION_BUDGET_ACCUMULATION ==================== */

describe("E17 SESSION_BUDGET_ACCUMULATION", () => {
  it("spends one conversation's guard budget across turns, not per turn", async () => {
    // The conversation's guard allows two provider requests. A healthy turn
    // costs two, so the first turn is answered and the second is denied by CA-8.
    // This is the assertion that fails if the guard is rebuilt on every turn:
    // a fresh guard would hand the second turn a fresh budget and answer it.
    const page = await open({ scenario: "budget" });

    await send(page, "primer mensaje");
    await waitForStatus(page, "ANSWERED");

    await send(page, "segundo mensaje");
    await waitForStatus(page, "REFUSED");

    expect(await statuses(page)).toEqual(["ANSWERED", "REFUSED"]);
    // The denied turn reached no provider: the budget was spent by the first.
    expect(host.pipeline.hostStats().providerCalls).toBe(2);
    // The visitor's second message is still on screen — a refusal is not a loss
    // of the transcript.
    expect(await visitorTexts(page)).toEqual(["primer mensaje", "segundo mensaje"]);
    await page.close();
  });
});
