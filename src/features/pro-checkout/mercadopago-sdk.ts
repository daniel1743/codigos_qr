/**
 * CRIPQER BILLING — THE OFFICIAL MERCADO PAGO CLIENT INTEGRATION (MP-M3D.7)
 *
 * Mercado Pago's current, non-deprecated client-side card integration is
 * MercadoPago.js v2 with its Secure Fields ("Core Methods" / `cardForm`). The
 * documentation is explicit that this is the path the Subscriptions product uses:
 * the `/preapproval` API reference points readers at the Checkout API's card
 * form, and the Subscriptions product's own card-token tutorial is a `cardForm`
 * tutorial. Card Payment Brick is also current, but the Brick requires an
 * `amount` at initialisation and the documentation never says what that amount
 * should be when the Brick exists purely to tokenize a card for a subscription;
 * adopting it would mean inventing a value whose effect is undocumented.
 * (`Web Tokenize Checkout` — a different, older product — was deprecated in
 * August 2022 and is not used here.)
 *
 * THE PAYMENT DATA BOUNDARY
 * `cardForm` renders its own iframes. The card number, the expiry and the CVV are
 * typed into Mercado Pago's frames and, in the documentation's words, "the data
 * entered in secure fields is never available to the integrating application".
 * What comes back is a `card_token_id` — single-use, expiring within 7 days —
 * and that token is the only thing this application ever holds.
 *
 * Cripqer therefore never has a PAN or a CVV to protect, because it never has one
 * at all. That is a stronger property than "we handle them carefully", and it is
 * a property of the ARCHITECTURE rather than of any line of code: the fields are
 * not in this DOM. Nothing in this module reads, stores, validates, formats or
 * transmits card data, because no card data ever reaches it.
 *
 * WHY THE SDK IS LOADED AT RUNTIME RATHER THAN BUNDLED
 * The official tag is `https://sdk.mercadopago.com/js/v2`. Loading it lazily
 * means the checkout page does not pay for the SDK, does not execute third-party
 * code, and does not open a connection to Mercado Pago until a payer has actually
 * decided to subscribe. It also means a page that is never going to show a card
 * form — because no Public Key is configured — never loads it at all.
 */

/**
 * The official v2 SDK. This exact URL is the one Mercado Pago documents; the
 * `.com` host is theirs and the `/js/v2` path is the versioned bundle.
 */
export const MERCADOPAGO_SDK_URL = "https://sdk.mercadopago.com/js/v2";

/** The global the SDK installs once loaded. */
export const MERCADOPAGO_SDK_GLOBAL = "MercadoPago";

/**
 * What `cardForm`'s `getCardFormData()` is documented to return, narrowed to the
 * one field this application is allowed to use.
 *
 * The real object also carries the card's BIN, the last four digits, the
 * installments and the issuer. Cripqer reads NONE of it. The type says so: there
 * is no field here for any of it, so a future edit cannot "just also send the
 * last four digits" without changing this interface, which is the moment a
 * reviewer sees it.
 */
export interface CardFormData {
  /** The single-use card token. The only value that leaves this object. */
  token?: string;
}

/** The `cardForm` instance the SDK returns. */
export interface CardFormController {
  /** Resolves with the tokenized card data once the payer submits. */
  getCardFormData(): Promise<CardFormData>;
  /** Tears down the iframes. Safe to call more than once. */
  unmount?(): void;
}

/** The minimal shape of the SDK constructor this file relies on. */
export interface MercadoPagoConstructor {
  new (publicKey: string, options?: { locale?: string }): {
    cardForm(options: {
      amount: string;
      iframe: boolean;
      cardForm: { id: string };
      callbacks: {
        onFormMounted?: (error?: unknown) => void;
        onSubmit?: (event: { preventDefault?: () => void }) => void;
        onFetching?: () => void;
      };
    }): CardFormController;
  };
}

/* ================================ loading =============================== */

export interface SdkLoadDeps {
  /** Defaults to the global `document`. Injected so this is testable. */
  document?: Pick<Document, "createElement" | "head" | "querySelector" | "getElementById">;
  /** Defaults to the global `window`. */
  window?: { [MERCADOPAGO_SDK_GLOBAL]?: unknown };
}

export type SdkLoadResult =
  | { ok: true; constructor: MercadoPagoConstructor }
  | { ok: false; reason: "NO_DOCUMENT" | "LOAD_FAILED" | "MISSING_GLOBAL" };

/**
 * The in-flight or completed load, per document.
 *
 * Shared deliberately: two components mounting on the same page must not inject
 * the script twice, and the second must not race the first into a half-initialised
 * global. Keyed weakly by document so a test that builds a fresh document does not
 * inherit a previous test's promise.
 */
const loads = new WeakMap<object, Promise<SdkLoadResult>>();

function isConstructor(value: unknown): value is MercadoPagoConstructor {
  return typeof value === "function";
}

/**
 * Loads the SDK, at most once per document. Never throws.
 *
 * A failed load is NOT retried and NOT cached as success: the promise resolves to
 * a closed failure, and the caller renders a state the payer can act on. A retry
 * loop here would turn a blocked third-party script into an infinite request
 * stream on a payment page.
 */
export async function loadMercadoPagoSdk(deps: SdkLoadDeps = {}): Promise<SdkLoadResult> {
  const doc =
    deps.document ??
    (typeof document === "undefined"
      ? undefined
      : (document as unknown as SdkLoadDeps["document"]));
  const win =
    deps.window ?? (typeof window === "undefined" ? undefined : (window as unknown as object));

  if (doc === undefined || win === undefined) return { ok: false, reason: "NO_DOCUMENT" };

  const existing = (win as Record<string, unknown>)[MERCADOPAGO_SDK_GLOBAL];
  if (isConstructor(existing)) return { ok: true, constructor: existing };
  // Present but not a constructor: something else owns the global name. Fail
  // closed rather than overwrite it — this is a payment page.
  if (existing !== undefined) return { ok: false, reason: "MISSING_GLOBAL" };

  const cached = loads.get(win as object);
  if (cached !== undefined) return cached;

  const pending = new Promise<SdkLoadResult>((resolve) => {
    const script = doc.createElement("script");
    script.setAttribute("src", MERCADOPAGO_SDK_URL);
    // `async` so the SDK never blocks the page's own hydration on a third-party
    // host, and no `defer` ordering assumption is made about it.
    script.setAttribute("async", "true");

    const settle = (): void => {
      const installed = (win as Record<string, unknown>)[MERCADOPAGO_SDK_GLOBAL];
      resolve(
        isConstructor(installed)
          ? { ok: true, constructor: installed }
          : { ok: false, reason: "MISSING_GLOBAL" },
      );
    };

    script.addEventListener("load", settle);
    // A blocked or unreachable third-party host is an ordinary outcome on a
    // payment page (an extension, a corporate proxy, an offline payer). It must
    // resolve to a renderable failure, never to an unhandled error event.
    script.addEventListener("error", () => resolve({ ok: false, reason: "LOAD_FAILED" }));

    doc.head.appendChild(script);
  });

  loads.set(win as object, pending);
  return pending;
}

/* ============================== card form =============================== */

export type CardFormMountResult =
  | { ok: true; form: CardFormController }
  | { ok: false; reason: "SDK_UNAVAILABLE" | "CONTAINER_MISSING" | "MOUNT_FAILED" };

export interface CardFormCallbacks {
  /** The card form's iframes are ready and the payer can type. */
  onMounted: () => void;
  /** The payer pressed the form's own submit button; the token is being minted. */
  onSubmit: () => void;
  /**
   * The token was minted. This is the ONLY place a card token enters Cripqer, and
   * it is handed straight to a function that spends it — it is not stored.
   */
  onToken: (cardTokenId: string) => void;
  /** The form could not be built, or the provider refused to mint a token. */
  onError: () => void;
}

/**
 * Builds and mounts the card form into a container Cripqer owns.
 *
 * The container is the ONE element this application contributes. Everything the
 * payer types goes into iframes Mercado Pago creates inside it, which is why the
 * boundary holds: there is no Cripqer `<input>` anywhere in this flow.
 *
 * `amount` is passed as the plan's price because the SDK requires the field, but
 * it is not a term of the subscription — the money lives in the remote plan, and
 * the server's own request to the provider never restates it.
 */
export async function mountCardForm(options: {
  constructor: MercadoPagoConstructor;
  publicKey: string;
  containerId: string;
  amount: string;
  locale?: string;
  /** Defaults to the global `document`. */
  document?: Pick<Document, "getElementById">;
  callbacks: CardFormCallbacks;
}): Promise<CardFormMountResult> {
  const doc =
    options.document ??
    (typeof document === "undefined"
      ? undefined
      : (document as unknown as Pick<Document, "getElementById">));

  if (doc === undefined) return { ok: false, reason: "CONTAINER_MISSING" };
  if (doc.getElementById(options.containerId) === null) {
    return { ok: false, reason: "CONTAINER_MISSING" };
  }

  try {
    const instance = new options.constructor(
      options.publicKey,
      options.locale === undefined ? undefined : { locale: options.locale },
    );

    let form: CardFormController | null = null;

    form = instance.cardForm({
      amount: options.amount,
      // `iframe: true` is the whole point: it is what keeps PAN and CVV inside
      // Mercado Pago's frames and out of this application's DOM.
      iframe: true,
      cardForm: { id: options.containerId },
      callbacks: {
        onFormMounted: (error?: unknown) => {
          if (error === undefined || error === null) options.callbacks.onMounted();
          else options.callbacks.onError();
        },
        onSubmit: (event: { preventDefault?: () => void }) => {
          // The SDK's own submit would reload the page; this form is a step in a
          // React flow, so the default is suppressed and the token is awaited.
          event?.preventDefault?.();
          options.callbacks.onSubmit();
          void readToken(form, options.callbacks);
        },
        onFetching: () => {
          // The SDK calls this while it is talking to Mercado Pago. Nothing to
          // do beyond letting the caller show its own pending state.
          options.callbacks.onSubmit();
        },
      },
    });

    if (form === null) return { ok: false, reason: "MOUNT_FAILED" };
    return { ok: true, form };
  } catch {
    return { ok: false, reason: "MOUNT_FAILED" };
  }
}

async function readToken(
  form: CardFormController | null,
  callbacks: CardFormCallbacks,
): Promise<void> {
  if (form === null) {
    callbacks.onError();
    return;
  }
  try {
    const data = await form.getCardFormData();
    const token = data?.token;
    if (typeof token !== "string" || token.trim() === "") {
      // The provider answered without a token: the card was declined, or the
      // data never validated. There is nothing to spend.
      callbacks.onError();
      return;
    }
    callbacks.onToken(token.trim());
  } catch {
    // A rejection here can carry the provider's own message about the card. It
    // is deliberately swallowed rather than surfaced or logged: Cripqer renders
    // its own copy, and a provider error about a card is not something to write
    // into a console attached to a payment page.
    callbacks.onError();
  }
}

/** Tears down a mounted form without throwing, whatever state it is in. */
export function unmountCardForm(form: CardFormController | null): void {
  try {
    form?.unmount?.();
  } catch {
    // Unmounting is best-effort. A form that refuses to tear down must not be
    // able to break the component that is leaving the screen.
  }
}
