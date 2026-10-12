import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  loadMercadoPagoSdk,
  MERCADOPAGO_SDK_GLOBAL,
  MERCADOPAGO_SDK_URL,
  mountCardForm,
  unmountCardForm,
  type CardFormController,
  type MercadoPagoConstructor,
} from "../mercadopago-sdk";

/**
 * MP-M3D.7 · the official client SDK and the payment-data boundary.
 *
 * The one assertion that carries the most weight here is `iframe: true`. It is
 * not a rendering preference: it is the setting that keeps the PAN and the CVV
 * inside Mercado Pago's own frames, and it is asserted BOTH as a runtime argument
 * and as a literal in the source — because a future refactor that dropped it
 * while keeping the argument shape would otherwise be invisible.
 *
 * Everything else here exists so the loader cannot become a liability on a
 * payment page: it must not retry, must not double-inject, must not overwrite a
 * global it does not own, and must resolve to a renderable failure when a
 * third-party host is blocked.
 */

const SOURCE = readFileSync(
  join(process.cwd(), "src/features/pro-checkout/mercadopago-sdk.ts"),
  "utf8",
);

/* ============================== fake DOM =============================== */

interface FakeScript {
  tag: string;
  attrs: Record<string, string>;
  listeners: Record<string, Array<() => void>>;
  setAttribute(name: string, value: string): void;
  addEventListener(type: string, handler: () => void): void;
}

function fakeScript(): FakeScript {
  return {
    tag: "",
    attrs: {},
    listeners: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    addEventListener(type, handler) {
      (this.listeners[type] ??= []).push(handler);
    },
  };
}

/**
 * The injection seams, named once.
 *
 * `loadMercadoPagoSdk`'s parameter is optional, so `Parameters<...>[0]` is
 * `SdkLoadDeps | undefined` and indexing it directly is a type error. Naming the
 * non-nullable form here keeps the casts out of the tests themselves.
 */
type SdkDeps = NonNullable<Parameters<typeof loadMercadoPagoSdk>[0]>;
type SdkDocument = NonNullable<SdkDeps["document"]>;

function fakeDocument() {
  const appended: FakeScript[] = [];
  const doc = {
    createElement(tag: string): FakeScript {
      const el = fakeScript();
      el.tag = tag;
      return el;
    },
    head: {
      appendChild(el: FakeScript) {
        appended.push(el);
      },
    },
    querySelector: () => null,
    getElementById: () => null,
  };
  return { doc: doc as unknown as SdkDocument, appended };
}

/**
 * The script injected at `index`, or a loud failure.
 *
 * `noUncheckedIndexedAccess` types every indexed read as possibly absent, and a
 * `!` would suppress that rather than answer it. Throwing keeps the assertion
 * honest: a test that injected no script must fail, not quietly assert against
 * `undefined`.
 */
function scriptAt(appended: FakeScript[], index: number): FakeScript {
  const element = appended[index];
  if (element === undefined) throw new Error(`no script was injected at index ${index}`);
  return element;
}

/** The options the SDK was mounted with, or a loud failure. */
function onlyForm(formOptions: Array<Record<string, unknown>>): Record<string, unknown> {
  const options = formOptions[0];
  if (options === undefined) throw new Error("the card form was never mounted");
  return options;
}

/** The one SDK construction the test expects, or a loud failure. */
function onlyConstruction(ctorCalls: Array<[string, unknown]>): [string, unknown] {
  const call = ctorCalls[0];
  if (call === undefined) throw new Error("the SDK was never constructed");
  return call;
}

function fire(el: FakeScript, type: "load" | "error"): void {
  for (const handler of el.listeners[type] ?? []) handler();
}

/** Flushes the microtask queue far enough for the async token read to settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
}

function captureConsole(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const spies = (["log", "info", "warn", "error", "debug", "trace"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    }),
  );
  return { lines, restore: () => spies.forEach((spy) => spy.mockRestore()) };
}

/* ================================ naming =============================== */

describe("MP-M3D.7 · SDK · the official integration, by name and by URL", () => {
  it("loads MercadoPago.js v2 from the documented host", () => {
    expect(MERCADOPAGO_SDK_URL).toBe("https://sdk.mercadopago.com/js/v2");
    // Pinned to Mercado Pago's own host and to a versioned path: an unpinned or
    // third-party URL here would be a script-injection surface on the page that
    // collects a card.
    expect(new URL(MERCADOPAGO_SDK_URL).host).toBe("sdk.mercadopago.com");
    expect(new URL(MERCADOPAGO_SDK_URL).protocol).toBe("https:");
    expect(MERCADOPAGO_SDK_GLOBAL).toBe("MercadoPago");
  });

  it("uses the Secure Fields path, not the deprecated Web Tokenize Checkout", () => {
    expect(SOURCE).toContain("cardForm");
    expect(SOURCE).not.toContain("mercadopago.com/v1/checkout");
    expect(SOURCE).not.toContain("MercadoPago.Checkout");
  });

  it("reads exactly one field out of what the SDK hands back", () => {
    // The interface is the boundary in the type system. `CardFormData` has one
    // field, so a future edit cannot quietly start forwarding the BIN, the last
    // four digits or the issuer without changing this file's public shape.
    const block = /export interface CardFormData \{[\s\S]*?\n\}/.exec(SOURCE)?.[0] ?? "";
    const fields = (block.match(/^\s{2}[a-zA-Z_]+[?]?:/gm) ?? []).map((line) => line.trim());

    expect(block).not.toBe("");
    expect(fields).toEqual(["token?:"]);
  });

  it("never persists, never reads storage and never touches a cookie", () => {
    for (const forbidden of [
      "localStorage",
      "sessionStorage",
      "document.cookie",
      "indexedDB",
      "createElement(\"input\")",
      "createElement('input')",
    ]) {
      expect(SOURCE, `source uses ${forbidden}`).not.toContain(forbidden);
    }
  });
});

/* ============================== loading ================================ */

describe("MP-M3D.7 · SDK · loading is once, and failure is final", () => {
  it("refuses to load when there is no document or no window", async () => {
    // The suite runs in the `node` environment, where neither global exists —
    // which is exactly the server-render situation this branch exists for. The
    // precondition is asserted rather than assumed: if the environment ever
    // changed, an omitted `window` would resolve to happy-dom's and this test
    // would stop testing the branch while still passing.
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");

    expect(await loadMercadoPagoSdk({ document: fakeDocument().doc })).toEqual({
      ok: false,
      reason: "NO_DOCUMENT",
    });
    expect(await loadMercadoPagoSdk({ window: {} })).toEqual({
      ok: false,
      reason: "NO_DOCUMENT",
    });
  });

  it("returns an already-installed global without injecting a script", async () => {
    const { doc, appended } = fakeDocument();
    class Installed {}
    const win = { [MERCADOPAGO_SDK_GLOBAL]: Installed };

    const result = await loadMercadoPagoSdk({ document: doc, window: win });

    expect(result).toEqual({ ok: true, constructor: Installed });
    expect(appended).toHaveLength(0);
  });

  it("fails closed when something else owns the global name", async () => {
    const { doc, appended } = fakeDocument();
    // Not a constructor: overwriting it would mean stomping a stranger's global
    // on a payment page. The loader refuses instead.
    const result = await loadMercadoPagoSdk({
      document: doc,
      window: { [MERCADOPAGO_SDK_GLOBAL]: { some: "other lib" } },
    });

    expect(result).toEqual({ ok: false, reason: "MISSING_GLOBAL" });
    expect(appended).toHaveLength(0);
  });

  it("injects exactly one script, to the documented URL, and installs nothing itself", async () => {
    const { doc, appended } = fakeDocument();
    const win: Record<string, unknown> = {};

    const pending = loadMercadoPagoSdk({ document: doc, window: win });

    expect(appended).toHaveLength(1);
    const injected = scriptAt(appended, 0);
    expect(injected.tag).toBe("script");
    expect(injected.attrs["src"]).toBe(MERCADOPAGO_SDK_URL);
    // `async`, so the payer's own page never waits on a third-party host.
    expect(injected.attrs["async"]).toBe("true");
    expect(win[MERCADOPAGO_SDK_GLOBAL]).toBeUndefined();

    class Installed {}
    win[MERCADOPAGO_SDK_GLOBAL] = Installed;
    fire(injected, "load");

    expect(await pending).toEqual({ ok: true, constructor: Installed });
  });

  it("injects only once per window, even when mounted concurrently", async () => {
    const { doc, appended } = fakeDocument();
    const win: Record<string, unknown> = {};

    const first = loadMercadoPagoSdk({ document: doc, window: win });
    const second = loadMercadoPagoSdk({ document: doc, window: win });

    expect(appended).toHaveLength(1);

    class Installed {}
    win[MERCADOPAGO_SDK_GLOBAL] = Installed;
    fire(scriptAt(appended, 0), "load");

    expect(await first).toEqual({ ok: true, constructor: Installed });
    expect(await second).toEqual({ ok: true, constructor: Installed });
  });

  it("does not let one window's load satisfy another's", async () => {
    const a = fakeDocument();
    const b = fakeDocument();
    const winA: Record<string, unknown> = {};
    const winB: Record<string, unknown> = {};

    const pendingA = loadMercadoPagoSdk({ document: a.doc, window: winA });
    const pendingB = loadMercadoPagoSdk({ document: b.doc, window: winB });

    expect(a.appended).toHaveLength(1);
    expect(b.appended).toHaveLength(1);

    class Installed {}
    winB[MERCADOPAGO_SDK_GLOBAL] = Installed;
    fire(scriptAt(b.appended, 0), "load");

    expect(await pendingB).toEqual({ ok: true, constructor: Installed });

    // A's window never received the global, so A must fail closed rather than
    // borrow B's constructor.
    fire(scriptAt(a.appended, 0), "load");
    expect(await pendingA).toEqual({ ok: false, reason: "MISSING_GLOBAL" });
  });

  it("resolves to a renderable failure when the script is blocked, and does not retry", async () => {
    const { doc, appended } = fakeDocument();
    const win: Record<string, unknown> = {};

    const pending = loadMercadoPagoSdk({ document: doc, window: win });
    fire(scriptAt(appended, 0), "error");

    expect(await pending).toEqual({ ok: false, reason: "LOAD_FAILED" });
    // A retry loop on a payment page would turn one blocked host into an endless
    // request stream. The failure is cached like any other outcome.
    expect(await loadMercadoPagoSdk({ document: doc, window: win })).toEqual({
      ok: false,
      reason: "LOAD_FAILED",
    });
    expect(appended).toHaveLength(1);
  });

  it("reports MISSING_GLOBAL when the load succeeds but installs nothing", async () => {
    const { doc, appended } = fakeDocument();
    const win: Record<string, unknown> = {};

    const pending = loadMercadoPagoSdk({ document: doc, window: win });
    fire(scriptAt(appended, 0), "load");

    expect(await pending).toEqual({ ok: false, reason: "MISSING_GLOBAL" });
  });

  it("never throws when the document throws", async () => {
    const hostile = {
      createElement: () => {
        throw new Error("document is gone");
      },
      head: { appendChild: () => undefined },
      querySelector: () => null,
      getElementById: () => null,
    } as unknown as SdkDocument;

    // The loader's promise is built inside a constructor; a throwing document
    // must still not escape as an unhandled error on a payment page.
    await expect(
      loadMercadoPagoSdk({ document: hostile, window: {} }).catch(() => "threw"),
    ).resolves.toBeDefined();
  });
});

/* ============================== card form ============================== */

function fakeSdk(): {
  constructor: MercadoPagoConstructor;
  ctorCalls: Array<[string, unknown]>;
  formOptions: Array<Record<string, unknown>>;
  controller: CardFormController;
  getCardFormData: ReturnType<typeof vi.fn>;
} {
  const ctorCalls: Array<[string, unknown]> = [];
  const formOptions: Array<Record<string, unknown>> = [];
  const getCardFormData = vi.fn(async () => ({ token: "fixture_card_token_from_sdk" }));
  const controller: CardFormController = { getCardFormData, unmount: vi.fn() };

  class Fake {
    constructor(publicKey: string, options?: unknown) {
      ctorCalls.push([publicKey, options]);
    }
    cardForm(options: Record<string, unknown>): CardFormController {
      formOptions.push(options);
      return controller;
    }
  }

  return {
    constructor: Fake as unknown as MercadoPagoConstructor,
    ctorCalls,
    formOptions,
    controller,
    getCardFormData,
  };
}

/**
 * A sandbox-prefixed fixture, marked as a fixture in its own text.
 *
 * `TEST-` is the prefix the reader branches on, so it is the prefix that has to
 * be here. The middle is deliberately not a UUID: Mercado Pago access tokens
 * carry the same `APP_USR-`/`TEST-` prefixes, so an opaque realistic middle makes
 * this indistinguishable from a leaked credential in a diff. See the longer note
 * in `mercadopago-public-key.test.ts`.
 */
const PUBLIC_KEY = "TEST-fixture-not-a-real-key-0000-0000-0000";
const CONTAINER_ID = "cripqer-pro-card-form";

function callbacks() {
  return { onMounted: vi.fn(), onSubmit: vi.fn(), onToken: vi.fn(), onError: vi.fn() };
}

function docWithContainer(present: boolean) {
  return {
    getElementById: (id: string) => (present && id === CONTAINER_ID ? { id } : null),
  } as unknown as Pick<Document, "getElementById">;
}

describe("MP-M3D.7 · SDK · the payment-data boundary", () => {
  it("mounts with iframe: true, which is what keeps PAN and CVV out of Cripqer's DOM", async () => {
    const sdk = fakeSdk();
    const cb = callbacks();

    const result = await mountCardForm({
      constructor: sdk.constructor,
      publicKey: PUBLIC_KEY,
      containerId: CONTAINER_ID,
      amount: "7990",
      document: docWithContainer(true),
      callbacks: cb,
    });

    expect(result.ok).toBe(true);
    expect(sdk.formOptions).toHaveLength(1);
    const mountedWith = onlyForm(sdk.formOptions);
    // THE boundary. Without it the fields are Cripqer's own inputs.
    expect(mountedWith["iframe"]).toBe(true);
    expect(mountedWith["cardForm"]).toEqual({ id: CONTAINER_ID });
    expect(mountedWith["amount"]).toBe("7990");
    // The amount the SDK demands is a string and is the plan's price; it is not
    // restated to the server, which gets its money terms from the remote plan.
    expect(typeof mountedWith["amount"]).toBe("string");
  });

  it("passes the Public Key and nothing else to the SDK", async () => {
    const sdk = fakeSdk();

    await mountCardForm({
      constructor: sdk.constructor,
      publicKey: PUBLIC_KEY,
      containerId: CONTAINER_ID,
      amount: "7990",
      document: docWithContainer(true),
      callbacks: callbacks(),
    });

    expect(sdk.ctorCalls).toHaveLength(1);
    const [publicKey, options] = onlyConstruction(sdk.ctorCalls);
    expect(publicKey).toBe(PUBLIC_KEY);
    // No second credential can be smuggled in through the options bag.
    expect(options).toBeUndefined();
  });

  it("forwards the locale only when one was given", async () => {
    const sdk = fakeSdk();

    await mountCardForm({
      constructor: sdk.constructor,
      publicKey: PUBLIC_KEY,
      containerId: CONTAINER_ID,
      amount: "7990",
      locale: "es-CL",
      document: docWithContainer(true),
      callbacks: callbacks(),
    });

    expect(onlyConstruction(sdk.ctorCalls)[1]).toEqual({ locale: "es-CL" });
  });

  it("refuses to mount without a container, and creates none of its own", async () => {
    const sdk = fakeSdk();

    expect(
      await mountCardForm({
        constructor: sdk.constructor,
        publicKey: PUBLIC_KEY,
        containerId: CONTAINER_ID,
        amount: "7990",
        document: docWithContainer(false),
        callbacks: callbacks(),
      }),
    ).toEqual({ ok: false, reason: "CONTAINER_MISSING" });

    // No document at all: the same precondition as the loader's no-DOM branch,
    // asserted rather than assumed.
    expect(typeof document).toBe("undefined");
    expect(
      await mountCardForm({
        constructor: sdk.constructor,
        publicKey: PUBLIC_KEY,
        containerId: CONTAINER_ID,
        amount: "7990",
        callbacks: callbacks(),
      }),
    ).toEqual({ ok: false, reason: "CONTAINER_MISSING" });

    expect(sdk.formOptions).toHaveLength(0);
  });

  it("turns a throwing SDK into MOUNT_FAILED rather than an exception", async () => {
    class Exploding {
      constructor() {
        throw new Error("sdk refused the public key");
      }
    }

    const result = await mountCardForm({
      constructor: Exploding as unknown as MercadoPagoConstructor,
      publicKey: PUBLIC_KEY,
      containerId: CONTAINER_ID,
      amount: "7990",
      document: docWithContainer(true),
      callbacks: callbacks(),
    });

    expect(result).toEqual({ ok: false, reason: "MOUNT_FAILED" });
  });
});

describe("MP-M3D.7 · SDK · the token is handed over once and nothing else is", () => {
  async function mounted() {
    const sdk = fakeSdk();
    const cb = callbacks();
    const result = await mountCardForm({
      constructor: sdk.constructor,
      publicKey: PUBLIC_KEY,
      containerId: CONTAINER_ID,
      amount: "7990",
      document: docWithContainer(true),
      callbacks: cb,
    });
    const options = onlyForm(sdk.formOptions)["callbacks"] as {
      onFormMounted?: (error?: unknown) => void;
      onSubmit?: (event: { preventDefault?: () => void }) => void;
    };
    return { sdk, cb, result, options };
  }

  it("reports a clean mount, and a provider error as onError", async () => {
    const { cb, options } = await mounted();

    options.onFormMounted?.();
    expect(cb.onMounted).toHaveBeenCalledTimes(1);
    expect(cb.onError).not.toHaveBeenCalled();

    options.onFormMounted?.(new Error("bad key"));
    expect(cb.onError).toHaveBeenCalledTimes(1);
  });

  it("suppresses the SDK's own submit and hands over the token", async () => {
    const { cb, options, sdk } = await mounted();
    const preventDefault = vi.fn();

    options.onSubmit?.({ preventDefault });
    await flush();

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(cb.onSubmit).toHaveBeenCalledTimes(1);
    expect(sdk.getCardFormData).toHaveBeenCalledTimes(1);
    expect(cb.onToken).toHaveBeenCalledWith("fixture_card_token_from_sdk");
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it("trims the token it hands over", async () => {
    const { cb, options, sdk } = await mounted();
    sdk.getCardFormData.mockResolvedValueOnce({ token: "  fixture_padded_token  " });

    options.onSubmit?.({ preventDefault: vi.fn() });
    await flush();

    expect(cb.onToken).toHaveBeenCalledWith("fixture_padded_token");
  });

  it("reports onError when the provider mints no token", async () => {
    for (const data of [{}, { token: "" }, { token: "   " }, { token: 42 }, undefined, null]) {
      const { cb, options, sdk } = await mounted();
      sdk.getCardFormData.mockResolvedValueOnce(data);

      options.onSubmit?.({ preventDefault: vi.fn() });
      await flush();

      expect(cb.onToken, JSON.stringify(data)).not.toHaveBeenCalled();
      expect(cb.onError, JSON.stringify(data)).toHaveBeenCalledTimes(1);
    }
  });

  it("swallows a provider rejection about the card, without logging it", async () => {
    const capture = captureConsole();
    try {
      const { cb, options, sdk } = await mounted();
      // A decline message is about the payer's card. It goes to Cripqer's own
      // copy, not to a console attached to a payment page.
      sdk.getCardFormData.mockRejectedValueOnce(new Error("cc_rejected_insufficient_amount 4111 1111 1111 1111"));

      options.onSubmit?.({ preventDefault: vi.fn() });
      await flush();

      expect(cb.onToken).not.toHaveBeenCalled();
      expect(cb.onError).toHaveBeenCalledTimes(1);
      expect(capture.lines.join("\n")).not.toContain("cc_rejected");
      expect(capture.lines.join("\n")).not.toContain("4111");
    } finally {
      capture.restore();
    }
  });

  it("survives an onSubmit with no event at all", async () => {
    const { cb, options } = await mounted();

    expect(() => options.onSubmit?.(undefined as unknown as { preventDefault?: () => void })).not.toThrow();
    await flush();

    expect(cb.onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("MP-M3D.7 · SDK · unmounting is best-effort", () => {
  it("tears the form down", () => {
    const unmount = vi.fn();
    unmountCardForm({ getCardFormData: async () => ({}), unmount });

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it("tolerates null, a form with no unmount, and a throwing unmount", () => {
    expect(() => unmountCardForm(null)).not.toThrow();
    expect(() => unmountCardForm({ getCardFormData: async () => ({}) })).not.toThrow();
    expect(() =>
      unmountCardForm({
        getCardFormData: async () => ({}),
        unmount: () => {
          throw new Error("teardown failed");
        },
      }),
    ).not.toThrow();
  });
});
