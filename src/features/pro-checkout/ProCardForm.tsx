/**
 * CRIPQER BILLING — THE PRO CARD FORM (MP-M3D.7)
 *
 * The integration point. Three modules already exist and each answers one
 * question — `mercadopago-public-key` ("is there a usable key"), `mercadopago-sdk`
 * ("load the official integration and mount its secure fields"), `start-pro-client`
 * ("hand the token to Cripqer's server") — and this component is the only place
 * they meet, plus the only place any of them is reached from a render tree.
 *
 * WHAT THIS COMPONENT DOES NOT RENDER
 * It renders NO card input. There is no `<input>` in this file and there must
 * never be one: the card number, expiry and CVV live inside iframes Mercado Pago
 * creates inside the container below. Cripqer contributes an empty `<div>`, which
 * is why this application never has a PAN or a CVV to protect — not because it
 * protects them well, but because it never receives them. A test asserts the
 * rendered subtree contains zero inputs, so an edit that "just adds a field"
 * fails there rather than in production.
 *
 * NOT YET MOUNTED ON ANY ROUTE, ON PURPOSE
 * No route imports this component. MP-M3D.7 is authorised to build the foundation
 * and NOT to complete a subscription, so it deliberately does not put a working
 * checkout in front of a payer. Mounting it — on `/account` or anywhere else — is
 * the first step of the next microphase, and it is a product decision about where
 * a payer meets the offer rather than a technical one.
 *
 * WHY IT DOES NOT LINK TO THE CHECKOUT URL
 * `startProWithCardToken` can return a provider `checkoutUrl`, and this component
 * accepts it, validates it, and then does NOT render it as a link. Following that
 * URL is the step that completes the subscription. Rendering it would be one line
 * here; that line belongs to whichever phase is authorised to actually go there.
 * `ProCardFormPhase`'s `STARTED` variant therefore has no `checkoutUrl` field at
 * all — the shape makes the omission structural rather than a matter of restraint.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  loadMercadoPagoSdk,
  mountCardForm,
  unmountCardForm,
  type CardFormController,
} from "./mercadopago-sdk";
import { readBrowserPublicKey, type PublicKeyReadResult } from "./mercadopago-public-key";
import { startProWithCardToken, type StartProResult } from "./start-pro-client";

/**
 * Every state this form can be in, as a closed union.
 *
 * A union rather than a set of booleans because the states are genuinely
 * exclusive: "the key is missing" and "the payer submitted and the server said
 * 409" cannot both be true, and modelling them as independent flags is how a UI
 * ends up rendering a spinner over an error.
 */
export type ProCardFormPhase =
  /** No usable Public Key. Nothing was loaded and nothing will be. */
  | { kind: "UNCONFIGURED" }
  /** The key is good; the SDK and the card form are on their way. */
  | { kind: "LOADING" }
  /** The SDK could not be loaded or the form could not be mounted. */
  | { kind: "UNAVAILABLE" }
  /** The card fields are on screen. The payer can type. */
  | { kind: "READY" }
  /** A token was minted and is being spent at Cripqer's server. */
  | { kind: "SUBMITTING" }
  /** The server created the subscription. See `providerSubscriptionStatus`. */
  | { kind: "STARTED"; providerSubscriptionStatus: string | null }
  /** The server, the provider, or the card refused. `reason` is a closed word. */
  | { kind: "REFUSED"; reason: string };

/**
 * What the payer is told for each refusal.
 *
 * Every key is a word the server itself sent, or a word this component produced
 * for a condition with no server round trip. There is no branch that forwards
 * provider prose: Mercado Pago's rejection messages name the payer's bank and the
 * card, and this application is not the right place to relay them.
 */
const REFUSAL_COPY: Readonly<Record<string, string>> = Object.freeze({
  CARD_NOT_TOKENIZED:
    "No pudimos validar la tarjeta. Revisá los datos e intentá de nuevo.",
  INVALID_REQUEST: "No pudimos iniciar la suscripción. Revisá los datos e intentá de nuevo.",
  UNCONFIGURED: "La suscripción no está disponible en este momento.",
  PAYER_EMAIL_REQUIRED: "Tu cuenta necesita un correo verificado para suscribirte.",
  ALREADY_IN_PROGRESS: "Ya tenés una suscripción en curso.",
  PROVIDER_ERROR: "Mercado Pago no respondió. No se realizó ningún cobro.",
  REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED:
    "Estamos verificando tu suscripción. No la inicies de nuevo.",
  UNAUTHENTICATED: "Iniciá sesión para suscribirte.",
  METHOD_NOT_ALLOWED: "La suscripción no está disponible en este momento.",
  INTERNAL_ERROR: "Algo falló de nuestro lado. No se realizó ningún cobro.",
  NETWORK_ERROR: "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.",
  UNEXPECTED_RESPONSE: "Recibimos una respuesta inesperada. No se realizó ningún cobro.",
});

/** Said only when a status arrives that this component has no copy for. */
const UNKNOWN_REFUSAL = "No pudimos completar la operación. No se realizó ningún cobro.";

export interface ProCardFormProps {
  /**
   * The plan's price, in the format the SDK expects. Required by `cardForm` and
   * NOT a term of the subscription: the money lives in the remote plan, and the
   * server's request to the provider never restates it.
   */
  amount: string;
  /**
   * The Public Key verdict. Defaults to reading the browser's build-time
   * environment; injected so a test can exercise the unconfigured branch without
   * a real key.
   */
  publicKey?: PublicKeyReadResult;
  /** Overrides the generated container id. */
  containerId?: string;
  /** Forwarded to the SDK when present. */
  locale?: string;
  /** Injected for tests. */
  loadSdk?: typeof loadMercadoPagoSdk;
  /** Injected for tests. */
  startPro?: typeof startProWithCardToken;
}

export function ProCardForm({
  amount,
  publicKey,
  containerId,
  locale,
  loadSdk = loadMercadoPagoSdk,
  startPro = startProWithCardToken,
}: ProCardFormProps) {
  // `useId` can contain characters that are awkward in an id, and the SDK looks
  // the container up by id, so the generated one is narrowed to a safe alphabet.
  const generatedId = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const containerIdResolved = containerId ?? `cripqer-pro-card-form-${generatedId}`;

  // The key is decided ONCE, at mount: it is a build-time constant, and
  // re-deciding it per render would let a re-render change whether the SDK is
  // allowed to load.
  const [key] = useState<PublicKeyReadResult>(() => publicKey ?? readBrowserPublicKey());
  const [phase, setPhase] = useState<ProCardFormPhase>(
    key.ok ? { kind: "LOADING" } : { kind: "UNCONFIGURED" },
  );

  const formRef = useRef<CardFormController | null>(null);
  /**
   * Set on unmount and read by every async continuation.
   *
   * Without it, a payer who navigates away mid-tokenization would have a `setState`
   * land on an unmounted tree — and, worse, a start-pro request would still be in
   * flight for a subscription nobody is waiting for.
   */
  const goneRef = useRef(false);

  const submit = useCallback(
    async (cardTokenId: string) => {
      // The token is a parameter and nothing more: it is never placed in state,
      // in a ref, or in a closure that outlives this call. It is spent here and
      // then out of reach — including on the failure branches below.
      const result = await callStartPro(startPro, cardTokenId);
      if (goneRef.current) return;

      if (!isStartProResult(result)) {
        // `startProWithCardToken` is total by contract and never throws — but it
        // is an INJECTED dependency, and the cost of being wrong about that is a
        // payment form pinned on "estamos iniciando…" forever behind an unhandled
        // rejection. The union is closed at runtime here, not only in the types.
        setPhase({ kind: "REFUSED", reason: "UNEXPECTED_RESPONSE" });
        return;
      }

      if (result.status === "READY") {
        setPhase({
          kind: "STARTED",
          providerSubscriptionStatus: result.providerSubscriptionStatus,
        });
        return;
      }
      setPhase({ kind: "REFUSED", reason: result.status });
    },
    [startPro],
  );

  useEffect(() => {
    goneRef.current = false;
    // FAIL CLOSED. With no usable key the SDK is never fetched and never
    // executed: a checkout page must not pull third-party code it cannot use.
    if (!key.ok) return;

    let cancelled = false;
    const alive = (): boolean => !cancelled && !goneRef.current;

    void (async () => {
      const loaded = await loadSdk();
      if (!alive()) return;
      if (!loaded.ok) {
        setPhase({ kind: "UNAVAILABLE" });
        return;
      }

      const mounted = await mountCardForm({
        constructor: loaded.constructor,
        publicKey: key.publicKey,
        containerId: containerIdResolved,
        amount,
        ...(locale === undefined ? {} : { locale }),
        callbacks: {
          onMounted: () => {
            if (alive()) setPhase({ kind: "READY" });
          },
          onSubmit: () => {
            if (alive()) setPhase({ kind: "SUBMITTING" });
          },
          onToken: (cardTokenId) => {
            if (alive()) void submit(cardTokenId);
          },
          onError: () => {
            // The card was declined, or its data never validated. No token
            // exists, so nothing was sent to Cripqer and no request is wasted.
            if (alive()) setPhase({ kind: "REFUSED", reason: "CARD_NOT_TOKENIZED" });
          },
        },
      });

      if (!alive()) {
        if (mounted.ok) unmountCardForm(mounted.form);
        return;
      }
      if (!mounted.ok) {
        setPhase({ kind: "UNAVAILABLE" });
        return;
      }
      formRef.current = mounted.form;
    })();

    return () => {
      cancelled = true;
      unmountCardForm(formRef.current);
      formRef.current = null;
    };
  }, [key, containerIdResolved, amount, locale, loadSdk, submit]);

  useEffect(
    () => () => {
      goneRef.current = true;
    },
    [],
  );

  const message = describe(phase);

  return (
    <section data-phase={phase.kind} aria-busy={phase.kind === "LOADING" || phase.kind === "SUBMITTING"}>
      {/*
        The one element this application contributes, and it is empty. Mercado
        Pago renders its own iframes inside it. `aria-hidden` is deliberately NOT
        set: the fields inside are the payer's, and hiding them from assistive
        technology would hide the form.
      */}
      {key.ok ? <div id={containerIdResolved} /> : null}
      {message === null ? null : <p role="status">{message}</p>}
    </section>
  );
}

/**
 * Calls the start-pro client and never throws, whatever the injected
 * implementation does.
 *
 * The `cardTokenId` is passed straight through and is not retained here either:
 * this wrapper adds a failure mode to the call, not another place the token rests.
 */
async function callStartPro(
  startPro: typeof startProWithCardToken,
  cardTokenId: string,
): Promise<unknown> {
  try {
    return await startPro({ cardTokenId });
  } catch {
    return null;
  }
}

/** Whether a value really is a member of the closed result union. */
function isStartProResult(value: unknown): value is StartProResult {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { status?: unknown }).status === "string"
  );
}

/** The payer-facing sentence for a phase, or null when the phase speaks for itself. */
function describe(phase: ProCardFormPhase): string | null {
  switch (phase.kind) {
    case "UNCONFIGURED":
      return "La suscripción no está disponible en este momento.";
    case "LOADING":
      return "Cargando el formulario de pago…";
    case "UNAVAILABLE":
      return "No pudimos cargar el formulario de pago. Intentá de nuevo más tarde.";
    case "READY":
      return null;
    case "SUBMITTING":
      return "Estamos iniciando tu suscripción…";
    case "STARTED":
      // Deliberately says nothing about a charge, and deliberately does not vary
      // with `providerSubscriptionStatus`. A provider status is not a receipt,
      // and the entitlement is granted by the webhook — never by this screen. If
      // this text ever starts promising "activa" because the status said
      // `authorized`, that is the bug this comment exists to prevent.
      return "Suscripción iniciada. Te confirmamos por correo cuando quede activa.";
    case "REFUSED":
      return REFUSAL_COPY[phase.reason] ?? UNKNOWN_REFUSAL;
  }
}
