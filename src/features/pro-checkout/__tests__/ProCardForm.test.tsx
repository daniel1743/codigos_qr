// @vitest-environment happy-dom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProCardForm, type ProCardFormPhase } from "../ProCardForm";
import type { CardFormController } from "../mercadopago-sdk";
import { readMercadoPagoPublicKey, type PublicKeyReadResult } from "../mercadopago-public-key";
import type { StartProResult } from "../start-pro-client";

/**
 * MP-M3D.7 · the integration point.
 *
 * The assertions that carry the weight here are all about what is NOT there:
 *
 *   · no `<input>` in the subtree — the PAN/CVV boundary, made checkable;
 *   · no card token anywhere in the rendered DOM;
 *   · no SDK fetch at all when the Public Key is missing;
 *   · no `<a href>` pointing at the provider's checkout, even when the server
 *     returns one.
 *
 * A test that only checked the happy path would pass on a component that leaked a
 * token into a `data-` attribute and offered a one-click path to a real
 * subscription.
 *
 * HOW IT DRIVES THE FORM. It fakes the SDK CONSTRUCTOR, not the SDK layer, so
 * the real `mountCardForm` translation runs and these tests speak Mercado Pago's
 * own callback vocabulary (`onFormMounted`, `onSubmit`) exactly as the provider
 * would. Faking `loadSdk` instead would have skipped that translation and tested
 * a component wired to handlers that do not exist — which is precisely the
 * mistake this file made in its first draft.
 */

/** A sandbox-prefixed fixture, marked as a fixture in its own text — see `mercadopago-public-key.test.ts`. */
const PUBLIC_KEY = "TEST-fixture-not-a-real-key-0000-0000-0000";
const TOKEN = "fixture_card_token_from_the_sdk";
const AMOUNT = "7990";
const CHECKOUT = "https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=SUB1";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
});

const OK_KEY: PublicKeyReadResult = readMercadoPagoPublicKey({
  VITE_MERCADOPAGO_PUBLIC_KEY: PUBLIC_KEY,
});
const NO_KEY: PublicKeyReadResult = { ok: false, reason: "NOT_CONFIGURED" };

/** The callbacks Mercado Pago's own SDK invokes, as `mountCardForm` passes them. */
interface NativeCallbacks {
  onFormMounted?: (error?: unknown) => void;
  onSubmit?: (event: { preventDefault?: () => void }) => void;
  onFetching?: () => void;
}

/** A stand-in for MercadoPago.js, recording how the form was built. */
function fakeSdk(options: { deferLoad?: boolean } = {}) {
  const getCardFormData = vi.fn(async (): Promise<{ token?: string }> => ({ token: TOKEN }));
  const unmount = vi.fn();
  const controller: CardFormController = { getCardFormData, unmount };
  const formOptions: Array<Record<string, unknown>> = [];
  const constructedWith: string[] = [];

  class FakeInstance {
    constructor(publicKey: string) {
      constructedWith.push(publicKey);
    }
    cardForm(formOpts: Record<string, unknown>): CardFormController {
      formOptions.push(formOpts);
      return controller;
    }
  }

  let release: (() => void) | null = null;
  const loadSdk = vi.fn(async () => {
    if (options.deferLoad === true) {
      // A real SDK load is a network round trip to a third-party host, so the
      // window in which a payer can navigate away is not hypothetical.
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    return {
      ok: true as const,
      constructor: FakeInstance as unknown as new (publicKey: string) => {
        cardForm(opts: Record<string, unknown>): CardFormController;
      },
    };
  });

  return {
    loadSdk,
    formOptions,
    constructedWith,
    getCardFormData,
    unmount,
    release: () => release?.(),
  };
}

/** The options the form was mounted with, or a loud failure. */
function onlyOption(formOptions: Array<Record<string, unknown>>): Record<string, unknown> {
  const first = formOptions[0];
  if (first === undefined) throw new Error("the card form was never mounted");
  return first;
}

/** The Mercado Pago callbacks the form was mounted with, or a loud failure. */
function callbacksOf(formOptions: Array<Record<string, unknown>>): NativeCallbacks {
  const first = onlyOption(formOptions);
  const callbacks = first["callbacks"];
  if (callbacks === undefined || callbacks === null) {
    throw new Error("the card form was mounted without callbacks");
  }
  return callbacks as NativeCallbacks;
}

/** The container Cripqer contributed, or a loud failure. */
function cardContainer(mount: HTMLElement): HTMLElement {
  const element = mount.querySelector<HTMLElement>("div[id^='cripqer-pro-card-form']");
  if (element === null) throw new Error("the card container was never rendered");
  return element;
}

/** The phase the component reports, read from its own `data-phase`. */
function phaseOf(mount: HTMLElement): string | undefined {
  return mount.querySelector("section")?.dataset["phase"];
}

async function render(ui: ReactElement): Promise<HTMLDivElement> {
  const host = document.createElement("div");
  document.body.append(host);
  container = host;
  root = createRoot(host);
  await act(async () => {
    root?.render(ui);
  });
  await settle();
  return host;
}

/** Flushes the async chains the component runs (load SDK → mount → token → POST). */
async function settle(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
}

function text(mount: HTMLElement): string {
  return mount.textContent ?? "";
}

/** Reports the iframes as ready, the way Mercado Pago's SDK would. */
async function notifyMounted(callbacks: NativeCallbacks): Promise<void> {
  await act(async () => {
    callbacks.onFormMounted?.();
  });
  await settle();
}

/** Submits the card form the way Mercado Pago's SDK would. */
async function submitCard(callbacks: NativeCallbacks): Promise<void> {
  await act(async () => {
    callbacks.onSubmit?.({ preventDefault: vi.fn() });
  });
  await settle();
}

describe("MP-M3D.7 · ProCardForm · the payment-data boundary", () => {
  it("renders no card input of its own, in any state", async () => {
    const sdk = fakeSdk();
    const mount = await render(
      <ProCardForm amount={AMOUNT} publicKey={OK_KEY} loadSdk={sdk.loadSdk as never} startPro={vi.fn() as never} />,
    );

    // The component contributes an empty container; Mercado Pago's iframes would
    // live inside it. Nothing here is Cripqer's own field, so there is nothing
    // here that could hold a PAN or a CVV.
    expect(mount.querySelectorAll("input")).toHaveLength(0);
    expect(mount.querySelectorAll("form")).toHaveLength(0);
    expect(mount.querySelectorAll("textarea, select")).toHaveLength(0);
    expect(mount.innerHTML).not.toMatch(/name=["'](card|cc|cvv|cvc|pan|expiry)/i);
    expect(cardContainer(mount).innerHTML).toBe("");
  });

  it("mounts the SDK's iframe form into the container it owns", async () => {
    const sdk = fakeSdk();
    const mount = await render(
      <ProCardForm amount={AMOUNT} publicKey={OK_KEY} loadSdk={sdk.loadSdk as never} startPro={vi.fn() as never} />,
    );

    expect(sdk.formOptions).toHaveLength(1);
    const mountedWith = onlyOption(sdk.formOptions);
    expect(mountedWith["iframe"]).toBe(true);
    expect(mountedWith["amount"]).toBe(AMOUNT);
    expect(mountedWith["cardForm"]).toEqual({ id: cardContainer(mount).id });
    expect(sdk.loadSdk).toHaveBeenCalledTimes(1);
    // The Public Key reaches the SDK, which needs it to encrypt card data in the
    // browser. It is the only credential that does.
    expect(sdk.constructedWith).toEqual([PUBLIC_KEY]);
  });
});

describe("MP-M3D.7 · ProCardForm · fails closed with no Public Key", () => {
  it("never loads the SDK and never renders a container", async () => {
    const sdk = fakeSdk();
    const mount = await render(
      <ProCardForm amount={AMOUNT} publicKey={NO_KEY} loadSdk={sdk.loadSdk as never} startPro={vi.fn() as never} />,
    );

    // The whole point: a page that cannot tokenize must not fetch or execute a
    // third-party payment SDK.
    expect(sdk.loadSdk).not.toHaveBeenCalled();
    expect(sdk.formOptions).toHaveLength(0);
    expect(mount.querySelector("div[id^='cripqer-pro-card-form']")).toBeNull();
    expect(phaseOf(mount)).toBe("UNCONFIGURED");
    expect(text(mount)).not.toContain("TEST-");
  });

  it("renders a payer-readable sentence rather than a silent dead form", async () => {
    const mount = await render(
      <ProCardForm amount={AMOUNT} publicKey={NO_KEY} loadSdk={vi.fn() as never} startPro={vi.fn() as never} />,
    );

    expect(text(mount).trim()).not.toBe("");
    expect(mount.querySelector("[role='status']")).not.toBeNull();
  });
});

describe("MP-M3D.7 · ProCardForm · the token is spent and not kept", () => {
  it("sends the token to the server once and renders no trace of it", async () => {
    const sdk = fakeSdk();
    const startPro = vi.fn(
      async (): Promise<StartProResult> => ({
        status: "READY",
        providerSubscriptionStatus: "authorized",
        checkoutUrl: CHECKOUT,
      }),
    );
    const mount = await render(
      <ProCardForm amount={AMOUNT} publicKey={OK_KEY} loadSdk={sdk.loadSdk as never} startPro={startPro as never} />,
    );
    await notifyMounted(callbacksOf(sdk.formOptions));

    await submitCard(callbacksOf(sdk.formOptions));

    expect(sdk.getCardFormData).toHaveBeenCalledTimes(1);
    expect(startPro).toHaveBeenCalledTimes(1);
    expect(startPro).toHaveBeenCalledWith({ cardTokenId: TOKEN });

    // Not in the markup, not in an attribute, not in a data- hook, not in the
    // serialized subtree.
    expect(mount.innerHTML).not.toContain(TOKEN);
    expect(mount.outerHTML).not.toContain("fixture_card_token");
    expect(JSON.stringify(mount.dataset)).not.toContain(TOKEN);
  });

  it("does NOT offer a followable link to the provider's checkout", async () => {
    const sdk = fakeSdk();
    const mount = await render(
      <ProCardForm
        amount={AMOUNT}
        publicKey={OK_KEY}
        loadSdk={sdk.loadSdk as never}
        startPro={
          vi.fn(async (): Promise<StartProResult> => ({
            status: "READY",
            providerSubscriptionStatus: "authorized",
            checkoutUrl: CHECKOUT,
          })) as never
        }
      />,
    );
    await notifyMounted(callbacksOf(sdk.formOptions));
    await submitCard(callbacksOf(sdk.formOptions));

    // Following this URL is the step that completes a subscription, and this
    // microphase is not authorised to complete one. The URL arrives, is accepted,
    // and stops here.
    expect(phaseOf(mount)).toBe("STARTED");
    expect(mount.querySelectorAll("a")).toHaveLength(0);
    expect(mount.innerHTML).not.toContain(CHECKOUT);
    expect(mount.innerHTML).not.toContain("mercadopago.cl");
  });

  it("never sends anything when the card could not be tokenized", async () => {
    const sdk = fakeSdk();
    sdk.getCardFormData.mockResolvedValueOnce({});
    const startPro = vi.fn(async (): Promise<StartProResult> => ({ status: "INTERNAL_ERROR" }));
    const mount = await render(
      <ProCardForm amount={AMOUNT} publicKey={OK_KEY} loadSdk={sdk.loadSdk as never} startPro={startPro as never} />,
    );
    await notifyMounted(callbacksOf(sdk.formOptions));
    await submitCard(callbacksOf(sdk.formOptions));

    // No token exists, so nothing crosses to Cripqer and no request is spent.
    expect(startPro).not.toHaveBeenCalled();
    expect(phaseOf(mount)).toBe("REFUSED");
    expect(text(mount)).not.toContain(TOKEN);
  });

  it("never sends anything when the provider refuses to mint a token", async () => {
    const sdk = fakeSdk();
    sdk.getCardFormData.mockRejectedValueOnce(new Error("cc_rejected_insufficient_amount"));
    const startPro = vi.fn(async (): Promise<StartProResult> => ({ status: "INTERNAL_ERROR" }));
    const mount = await render(
      <ProCardForm amount={AMOUNT} publicKey={OK_KEY} loadSdk={sdk.loadSdk as never} startPro={startPro as never} />,
    );
    await submitCard(callbacksOf(sdk.formOptions));

    expect(startPro).not.toHaveBeenCalled();
    expect(phaseOf(mount)).toBe("REFUSED");
    // The provider's message names the payer's bank and card; it is not relayed.
    expect(text(mount)).not.toContain("cc_rejected");
    expect(text(mount)).not.toContain("insufficient_amount");
  });
});

describe("MP-M3D.7 · ProCardForm · every outcome renders something", () => {
  const REFUSALS: StartProResult[] = [
    { status: "INVALID_REQUEST" },
    { status: "UNCONFIGURED" },
    { status: "PAYER_EMAIL_REQUIRED" },
    { status: "ALREADY_IN_PROGRESS" },
    { status: "PROVIDER_ERROR" },
    { status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED" },
    { status: "UNAUTHENTICATED" },
    { status: "METHOD_NOT_ALLOWED" },
    { status: "INTERNAL_ERROR" },
    { status: "NETWORK_ERROR" },
    { status: "UNEXPECTED_RESPONSE" },
  ];

  it.each(REFUSALS.map((result) => ({ status: result.status, result })))(
    "renders payer-facing copy for $status",
    async ({ result }) => {
      const sdk = fakeSdk();
      const mount = await render(
        <ProCardForm
          amount={AMOUNT}
          publicKey={OK_KEY}
          loadSdk={sdk.loadSdk as never}
          startPro={vi.fn(async (): Promise<StartProResult> => result) as never}
        />,
      );
      await notifyMounted(callbacksOf(sdk.formOptions));
      await submitCard(callbacksOf(sdk.formOptions));

      expect(phaseOf(mount)).toBe("REFUSED");
      expect(text(mount).trim()).not.toBe("");
      // No internal status word leaked to the payer, and no token.
      expect(text(mount)).not.toContain(result.status);
      expect(mount.innerHTML).not.toContain(TOKEN);
    },
  );

  it("renders a closed sentence, not a raw status, when the server sends an unknown one", async () => {
    const sdk = fakeSdk();
    const mount = await render(
      <ProCardForm
        amount={AMOUNT}
        publicKey={OK_KEY}
        loadSdk={sdk.loadSdk as never}
        // A status the client module maps to UNEXPECTED_RESPONSE; this asserts the
        // component would not print an arbitrary string either.
        startPro={vi.fn(async () => ({ status: "SOMETHING_NEW" })) as never}
      />,
    );
    await notifyMounted(callbacksOf(sdk.formOptions));
    await submitCard(callbacksOf(sdk.formOptions));

    expect(text(mount)).not.toContain("SOMETHING_NEW");
    expect(text(mount).trim()).not.toBe("");
  });
});

describe("MP-M3D.7 · ProCardForm · lifecycle", () => {
  it("tears the card form down on unmount", async () => {
    const sdk = fakeSdk();
    await render(
      <ProCardForm amount={AMOUNT} publicKey={OK_KEY} loadSdk={sdk.loadSdk as never} startPro={vi.fn() as never} />,
    );
    await notifyMounted(callbacksOf(sdk.formOptions));

    act(() => root?.unmount());
    root = null;

    expect(sdk.unmount).toHaveBeenCalled();
  });

  it("stops after unmount instead of updating a tree that is gone", async () => {
    const sdk = fakeSdk();
    let resolveStart: ((result: StartProResult) => void) | null = null;
    const startPro = vi.fn(
      () =>
        new Promise<StartProResult>((resolve) => {
          resolveStart = resolve;
        }),
    );
    await render(
      <ProCardForm amount={AMOUNT} publicKey={OK_KEY} loadSdk={sdk.loadSdk as never} startPro={startPro as never} />,
    );
    await notifyMounted(callbacksOf(sdk.formOptions));
    await submitCard(callbacksOf(sdk.formOptions));

    act(() => root?.unmount());
    root = null;

    // The response arrives after the payer left. It must be dropped, not rendered
    // — and it must not throw.
    await act(async () => {
      resolveStart?.({ status: "READY", providerSubscriptionStatus: "authorized", checkoutUrl: null });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container?.innerHTML).toBe("");
  });

  it("does NOT start a subscription with a token that arrives after the payer left", async () => {
    const sdk = fakeSdk();
    // The token is minted asynchronously — the provider is talking to the bank —
    // so the window in which a payer can close the tab is real.
    let mintToken: ((value: { token?: string }) => void) | null = null;
    sdk.getCardFormData.mockReturnValueOnce(
      new Promise((resolve) => {
        mintToken = resolve;
      }),
    );
    const startPro = vi.fn(
      async (): Promise<StartProResult> => ({
        status: "READY",
        providerSubscriptionStatus: "authorized",
        checkoutUrl: null,
      }),
    );
    await render(
      <ProCardForm amount={AMOUNT} publicKey={OK_KEY} loadSdk={sdk.loadSdk as never} startPro={startPro as never} />,
    );
    await notifyMounted(callbacksOf(sdk.formOptions));

    // The payer submits, then leaves before the card finishes tokenizing.
    await act(async () => {
      callbacksOf(sdk.formOptions).onSubmit?.({ preventDefault: vi.fn() });
    });
    act(() => root?.unmount());
    root = null;

    await act(async () => {
      mintToken?.({ token: TOKEN });
    });
    await settle();

    // A subscription must never be started for someone who is no longer there.
    expect(startPro).not.toHaveBeenCalled();
  });

  it("never mounts a card form for a payer who left while the SDK was loading", async () => {
    const sdk = fakeSdk({ deferLoad: true });
    await render(
      <ProCardForm amount={AMOUNT} publicKey={OK_KEY} loadSdk={sdk.loadSdk as never} startPro={vi.fn() as never} />,
    );
    expect(sdk.loadSdk).toHaveBeenCalledTimes(1);
    expect(sdk.formOptions).toHaveLength(0);

    // The payer navigates away mid-load — the ordinary case, since loading the
    // SDK is a round trip to a third-party host.
    act(() => root?.unmount());
    root = null;

    await act(async () => {
      sdk.release();
    });
    await settle();

    // No iframes are created for a payer who is no longer there, and nothing is
    // left mounted in a detached tree.
    expect(sdk.formOptions).toHaveLength(0);
    expect(sdk.constructedWith).toHaveLength(0);
    expect(sdk.unmount).not.toHaveBeenCalled();
  });

  it("reports an unavailable form rather than hanging when the SDK cannot load", async () => {
    const mount = await render(
      <ProCardForm
        amount={AMOUNT}
        publicKey={OK_KEY}
        loadSdk={vi.fn(async () => ({ ok: false as const, reason: "LOAD_FAILED" as const })) as never}
        startPro={vi.fn() as never}
      />,
    );

    expect(phaseOf(mount)).toBe("UNAVAILABLE");
    expect(text(mount).trim()).not.toBe("");
  });

  it("reports an unavailable form when the container cannot be found", async () => {
    // A key that is fine but a document that has no such element: the SDK layer
    // refuses, and the component must say so rather than render nothing.
    const mount = await render(
      <ProCardForm
        amount={AMOUNT}
        publicKey={OK_KEY}
        containerId="a-container-that-does-not-exist"
        loadSdk={vi.fn(async () => ({
          ok: true as const,
          constructor: (class {
            cardForm(): CardFormController {
              throw new Error("the SDK was never supposed to build a form");
            }
          }) as never,
        })) as never}
        startPro={vi.fn() as never}
      />,
    );

    expect(phaseOf(mount)).toBe("UNAVAILABLE");
  });

  it("renders a refusal when the dependency rejects or returns a non-result", async () => {
    const misbehaviours: Array<[string, () => Promise<unknown>]> = [
      ["rejects", () => Promise.reject(new Error("StartProClient exploded"))],
      ["resolves to undefined", () => Promise.resolve(undefined)],
      ["resolves to null", () => Promise.resolve(null)],
      ["resolves to a bare object", () => Promise.resolve({} as StartProResult)],
      ["resolves to a non-string status", () => Promise.resolve({ status: 200 })],
      ["resolves to a string", () => Promise.resolve("READY")],
    ];

    for (const [what, misbehaviour] of misbehaviours) {
      const sdk = fakeSdk();
      const mount = await render(
        <ProCardForm
          amount={AMOUNT}
          publicKey={OK_KEY}
          loadSdk={sdk.loadSdk as never}
          startPro={vi.fn(misbehaviour as never) as never}
        />,
      );
      await notifyMounted(callbacksOf(sdk.formOptions));
      await submitCard(callbacksOf(sdk.formOptions));

      // The failure being guarded is "estamos iniciando tu suscripción…" forever,
      // behind an unhandled rejection. There must be a sentence instead.
      expect(phaseOf(mount), what).toBe("REFUSED");
      expect(text(mount).trim(), what).not.toBe("");
      // ...and it must stop claiming to be working.
      expect(mount.querySelector("section")?.getAttribute("aria-busy"), what).toBe("false");
    }
  });

  it("WAITS, without throwing, when the dependency never settles", async () => {
    // A promise that never resolves is indistinguishable from a slow network, and
    // the correct behaviour is to keep waiting — deliberately, not by omission.
    // There is NO timeout here: aborting a start-pro whose request may already
    // have created a subscription at the provider would be worse than waiting,
    // and reconciliation via the webhook is what resolves the ambiguity.
    const sdk = fakeSdk();
    const mount = await render(
      <ProCardForm
        amount={AMOUNT}
        publicKey={OK_KEY}
        loadSdk={sdk.loadSdk as never}
        startPro={vi.fn((() => ({ then: () => undefined })) as never) as never}
      />,
    );
    await notifyMounted(callbacksOf(sdk.formOptions));
    await submitCard(callbacksOf(sdk.formOptions));

    expect(phaseOf(mount)).toBe("SUBMITTING");
    // Still honestly reporting that it is working, rather than pretending to know.
    expect(mount.querySelector("section")?.getAttribute("aria-busy")).toBe("true");
    expect(text(mount)).toContain("iniciando");
  });

  it("keeps its phase a closed union member in every state it reached", async () => {
    const sdk = fakeSdk();
    const mount = await render(
      <ProCardForm
        amount={AMOUNT}
        publicKey={OK_KEY}
        loadSdk={sdk.loadSdk as never}
        startPro={
          vi.fn(async (): Promise<StartProResult> => ({
            status: "READY",
            providerSubscriptionStatus: "authorized",
            checkoutUrl: null,
          })) as never
        }
      />,
    );

    const seen = new Set<string>([String(phaseOf(mount))]);
    await notifyMounted(callbacksOf(sdk.formOptions));
    seen.add(String(phaseOf(mount)));
    await submitCard(callbacksOf(sdk.formOptions));
    seen.add(String(phaseOf(mount)));

    const allowed: Array<ProCardFormPhase["kind"]> = [
      "UNCONFIGURED",
      "LOADING",
      "UNAVAILABLE",
      "READY",
      "SUBMITTING",
      "STARTED",
      "REFUSED",
    ];
    for (const phase of seen) expect(allowed).toContain(phase);
  });
});
