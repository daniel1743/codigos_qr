/**
 * CRIPQER BILLING — CANONICAL SERVER BILLING CATALOG SELFCHECK V1
 *
 * PURE LOCAL — no network, no database, no provider SDK, no secrets.
 * Exercises the catalog resolver and validation against trusted in-memory
 * fixtures only.
 *
 * Run: node src/server/billing/catalog.selfcheck.ts
 *
 * NOTE: every amount / currency / provider reference below is a TEST FIXTURE.
 * They are NOT production prices, NOT portable placeholder data, and NOT
 * _TEST provider IDs promoted to production. They exist solely to exercise the
 * resolver and validation logic.
 */

import {
  DEFAULT_BILLING_CATALOG,
  EMPTY_CATALOG_REGISTRY,
  createBillingCatalog,
  validateCatalogOffers,
  type CatalogOfferDefinition,
  type CatalogRegistry,
  type CatalogValidationResult,
} from "./catalog.ts";

import type { ValidatedCheckoutRequest } from "./checkout.ts";

// ============================================================
// ASSERTION HELPERS
// ============================================================

let assertions = 0;

function assert(condition: unknown, message: string): asserts condition {
  assertions++;
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function assertNull(value: unknown, message: string): void {
  assertions++;
  if (value !== null) {
    throw new Error(
      `ASSERTION FAILED: ${message} (expected null, got ${JSON.stringify(value)})`,
    );
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assertions++;
  if (actual !== expected) {
    throw new Error(
      `ASSERTION FAILED: ${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
    );
  }
}

function codesOf(result: CatalogValidationResult): string[] {
  return result.issues.map((i) => i.code);
}

function hasCode(result: CatalogValidationResult, code: string): boolean {
  return codesOf(result).includes(code);
}

// ============================================================
// FIXTURE HELPERS
// ============================================================

function makeOffer(
  o: Partial<
    Omit<CatalogOfferDefinition, "planId" | "billingInterval" | "provider">
  > & {
    planId: string;
    billingInterval: string;
    provider: string;
  },
): CatalogOfferDefinition {
  return {
    currency: "USD",
    amount: 1000,
    providerOfferReference: "fixture.reference",
    enabled: true,
    ...o,
  } as CatalogOfferDefinition;
}

function makeRequest(
  planId: string,
  billingInterval: string,
  provider: string,
): ValidatedCheckoutRequest {
  return { planId, billingInterval, provider } as unknown as ValidatedCheckoutRequest;
}


// ============================================================
// TEST CASES
// ============================================================

function testEmptyRegistryFailsClosed(): void {
  const catalog = createBillingCatalog(EMPTY_CATALOG_REGISTRY);

  assertEqual(catalog.offers.length, 0, "default registry has zero offers");
  assertEqual(catalog.validation.valid, true, "empty registry is structurally valid");

  assertNull(
    catalog.resolveOffer(makeRequest("pro", "monthly", "stripe")),
    "empty registry: pro/monthly/stripe does not resolve",
  );
  assertNull(
    catalog.resolveOffer(makeRequest("business", "yearly", "mercado_pago")),
    "empty registry: business/yearly/mercado_pago does not resolve",
  );
  assertNull(
    DEFAULT_BILLING_CATALOG.resolveOffer(makeRequest("pro", "yearly", "paypal")),
    "default catalog never produces an accidental production offer",
  );
}

function testValidOffersResolve(): void {
  const registry: CatalogRegistry = {
    offers: [
      makeOffer({
        planId: "pro",
        billingInterval: "monthly",
        provider: "stripe",
        currency: "USD",
        amount: 1234,
        providerOfferReference: "fixture.stripe.pro.monthly",
      }),
      makeOffer({
        planId: "business",
        billingInterval: "yearly",
        provider: "mercado_pago",
        currency: "USD",
        amount: 23456,
        providerOfferReference: "fixture.mp.business.yearly",
      }),
      makeOffer({
        planId: "pro",
        billingInterval: "yearly",
        provider: "paypal",
        currency: "USD",
        amount: 12345,
        providerOfferReference: "fixture.paypal.pro.yearly",
      }),
    ],
  };

  const catalog = createBillingCatalog(registry);
  assertEqual(catalog.validation.valid, true, "valid registry validates clean");

  const proStripe = catalog.resolveOffer(makeRequest("pro", "monthly", "stripe"));
  assert(proStripe !== null, "pro/monthly/stripe resolves");
  assertEqual(proStripe.planId, "pro", "pro/monthly/stripe planId");
  assertEqual(proStripe.billingInterval, "monthly", "pro/monthly/stripe interval");
  assertEqual(proStripe.provider, "stripe", "pro/monthly/stripe provider");
  assertEqual(proStripe.currency, "USD", "pro/monthly/stripe currency");
  assertEqual(proStripe.amount, 1234, "pro/monthly/stripe amount");
  assertEqual(
    proStripe.providerOfferReference,
    "fixture.stripe.pro.monthly",
    "pro/monthly/stripe reference",
  );

  const bizYearly = catalog.resolveOffer(
    makeRequest("business", "yearly", "mercado_pago"),
  );
  assert(bizYearly !== null, "business/yearly/mercado_pago resolves");
  assertEqual(bizYearly.amount, 23456, "business/yearly/mercado_pago amount");

  const proYearlyPaypal = catalog.resolveOffer(
    makeRequest("pro", "yearly", "paypal"),
  );
  assert(proYearlyPaypal !== null, "pro/yearly/paypal resolves");
  assertEqual(proYearlyPaypal.amount, 12345, "pro/yearly/paypal amount");
}

function testClientIndependence(): void {
  const registry: CatalogRegistry = {
    offers: [
      makeOffer({
        planId: "pro",
        billingInterval: "monthly",
        provider: "stripe",
        currency: "USD",
        amount: 4321,
        providerOfferReference: "fixture.stripe.pro.monthly",
      }),
    ],
  };
  const catalog = createBillingCatalog(registry);

  // A request that smuggles client-side amount/currency must be ignored.
  const bogus = {
    planId: "pro",
    billingInterval: "monthly",
    provider: "stripe",
    amount: 1,
    currency: "XYZ",
    providerOfferReference: "client-forged-ref",
  } as unknown as ValidatedCheckoutRequest;

  const resolved = catalog.resolveOffer(bogus);
  assert(resolved !== null, "offer resolves despite smuggled client fields");
  assertEqual(resolved.amount, 4321, "amount derives from trusted registry only");
  assertEqual(resolved.currency, "USD", "currency derives from trusted registry only");
  assertEqual(
    resolved.providerOfferReference,
    "fixture.stripe.pro.monthly",
    "reference derives from trusted registry only",
  );
}

function testFreeOfferRejected(): void {
  const registry: CatalogRegistry = {
    offers: [
      makeOffer({
        planId: "free",
        billingInterval: "monthly",
        provider: "stripe",
        amount: 0,
        providerOfferReference: "",
        enabled: false,
      }),
    ],
  };

  const validation = validateCatalogOffers(registry.offers);
  assert(hasCode(validation, "FREE_OFFER"), "free offer flagged FREE_OFFER");
  assertEqual(validation.valid, false, "free offer makes registry invalid");

  const catalog = createBillingCatalog(registry);
  assertNull(
    catalog.resolveOffer(makeRequest("free", "monthly", "stripe")),
    "free plan never resolves to an offer",
  );
}

function testDuplicateRejected(): void {
  const registry: CatalogRegistry = {
    offers: [
      makeOffer({
        planId: "pro",
        billingInterval: "monthly",
        provider: "stripe",
        amount: 1111,
        providerOfferReference: "fixture.dup.one",
      }),
      makeOffer({
        planId: "pro",
        billingInterval: "monthly",
        provider: "stripe",
        amount: 2222,
        providerOfferReference: "fixture.dup.two",
      }),
    ],
  };

  const validation = validateCatalogOffers(registry.offers);
  assert(hasCode(validation, "DUPLICATE_OFFER"), "duplicate flagged DUPLICATE_OFFER");
  assertEqual(validation.valid, false, "duplicate makes registry invalid");

  const catalog = createBillingCatalog(registry);
  assertNull(
    catalog.resolveOffer(makeRequest("pro", "monthly", "stripe")),
    "ambiguous duplicate offer fails closed",
  );
}

function testInvalidAmountRejected(): void {
  // amount 0 on an enabled offer.
  const zero = makeOffer({
    planId: "pro",
    billingInterval: "monthly",
    provider: "stripe",
    amount: 0,
  });
  const zeroResult = validateCatalogOffers([zero]);
  assert(hasCode(zeroResult, "MALFORMED_ENABLED_OFFER"), "amount 0 flagged on enabled offer");
  assertEqual(zeroResult.valid, false, "amount 0 makes registry invalid");

  // negative amount.
  const negative = makeOffer({
    planId: "pro",
    billingInterval: "monthly",
    provider: "stripe",
    amount: -5,
  });
  const negativeResult = validateCatalogOffers([negative]);
  assert(hasCode(negativeResult, "INVALID_AMOUNT"), "negative amount flagged INVALID_AMOUNT");

  // non-integer amount.
  const fraction = makeOffer({
    planId: "pro",
    billingInterval: "monthly",
    provider: "stripe",
    amount: 9.5,
  });
  const fractionResult = validateCatalogOffers([fraction]);
  assert(hasCode(fractionResult, "INVALID_AMOUNT"), "fraction amount flagged INVALID_AMOUNT");

  // Resolver fails closed on an enabled offer with a non-positive amount.
  const catalog = createBillingCatalog({ offers: [zero] });
  assertNull(
    catalog.resolveOffer(makeRequest("pro", "monthly", "stripe")),
    "non-positive amount fails closed at resolve",
  );
}

function testInvalidCurrencyRejected(): void {
  const empty = makeOffer({
    planId: "pro",
    billingInterval: "monthly",
    provider: "stripe",
    currency: "",
  });
  assert(hasCode(validateCatalogOffers([empty]), "INVALID_CURRENCY"), "empty currency flagged");

  const lowercase = makeOffer({
    planId: "pro",
    billingInterval: "monthly",
    provider: "stripe",
    currency: "usd",
  });
  assert(
    hasCode(validateCatalogOffers([lowercase]), "INVALID_CURRENCY"),
    "lowercase currency flagged",
  );

  const catalog = createBillingCatalog({ offers: [empty] });
  assertNull(
    catalog.resolveOffer(makeRequest("pro", "monthly", "stripe")),
    "invalid currency fails closed at resolve",
  );
}

function testEmptyProviderReferenceRejected(): void {
  const offer = makeOffer({
    planId: "pro",
    billingInterval: "monthly",
    provider: "stripe",
    providerOfferReference: "",
  });
  const validation = validateCatalogOffers([offer]);
  assert(
    hasCode(validation, "EMPTY_PROVIDER_REFERENCE"),
    "empty providerOfferReference flagged",
  );

  const catalog = createBillingCatalog({ offers: [offer] });
  assertNull(
    catalog.resolveOffer(makeRequest("pro", "monthly", "stripe")),
    "empty providerOfferReference fails closed at resolve",
  );
}

function testDisabledOfferDoesNotResolve(): void {
  const registry: CatalogRegistry = {
    offers: [
      makeOffer({
        planId: "pro",
        billingInterval: "monthly",
        provider: "stripe",
        amount: 5000,
        providerOfferReference: "fixture.disabled",
        enabled: false,
      }),
    ],
  };
  const catalog = createBillingCatalog(registry);
  assertEqual(catalog.validation.valid, true, "disabled well-formed offer is valid");
  assertNull(
    catalog.resolveOffer(makeRequest("pro", "monthly", "stripe")),
    "disabled offer does not resolve",
  );
}


function testUnsupportedRejected(): void {
  const badPlan = makeOffer({
    planId: "premium",
    billingInterval: "monthly",
    provider: "stripe",
  });
  const badInterval = makeOffer({
    planId: "pro",
    billingInterval: "weekly",
    provider: "stripe",
  });
  const badProvider = makeOffer({
    planId: "pro",
    billingInterval: "monthly",
    provider: "venmo",
  });

  assert(hasCode(validateCatalogOffers([badPlan]), "UNSUPPORTED_PLAN"), "unsupported plan flagged");
  assert(
    hasCode(validateCatalogOffers([badInterval]), "UNSUPPORTED_INTERVAL"),
    "unsupported interval flagged",
  );
  assert(
    hasCode(validateCatalogOffers([badProvider]), "UNSUPPORTED_PROVIDER"),
    "unsupported provider flagged",
  );

  const catalog = createBillingCatalog({
    offers: [
      makeOffer({
        planId: "pro",
        billingInterval: "monthly",
        provider: "stripe",
      }),
    ],
  });
  assertNull(
    catalog.resolveOffer(makeRequest("premium", "monthly", "stripe")),
    "unsupported plan fails closed at resolve",
  );
  assertNull(
    catalog.resolveOffer(makeRequest("pro", "weekly", "stripe")),
    "unsupported interval fails closed at resolve",
  );
  assertNull(
    catalog.resolveOffer(makeRequest("pro", "monthly", "venmo")),
    "unsupported provider fails closed at resolve",
  );
}

function testEnterpriseContactSales(): void {
  const registry: CatalogRegistry = {
    offers: [
      makeOffer({
        planId: "enterprise",
        billingInterval: "yearly",
        provider: "stripe",
        amount: 0,
        providerOfferReference: "",
        enabled: false,
      }),
    ],
    planPresentation: [
      {
        planId: "enterprise",
        displayName: "Enterprise",
        order: 3,
        shortDescription: null,
        contactSales: true,
      },
    ],
  };

  const catalog = createBillingCatalog(registry);
  assertEqual(
    catalog.validation.valid,
    true,
    "Enterprise contact-sales offer (disabled, amount 0) is valid",
  );
  assertNull(
    catalog.resolveOffer(makeRequest("enterprise", "yearly", "stripe")),
    "Enterprise contact-sales offer does not resolve (no checkout-enabled offer)",
  );
  assertEqual(
    catalog.planPresentation[0]?.contactSales,
    true,
    "Enterprise presentation carries contactSales marker",
  );
}

function testPortablePlaceholderNotUsedByDefault(): void {
  assertEqual(
    DEFAULT_BILLING_CATALOG.offers.length,
    0,
    "default catalog contains no portable placeholder offers",
  );
  assertEqual(
    DEFAULT_BILLING_CATALOG.validation.valid,
    true,
    "default catalog validates clean",
  );
  assertNull(
    DEFAULT_BILLING_CATALOG.resolveOffer(makeRequest("pro", "monthly", "stripe")),
    "no portable placeholder price is reachable by default",
  );
}



// ============================================================
// RUNNER
// ============================================================

function run(): void {
  const tests: Array<[string, () => void]> = [
    ["empty_registry_fails_closed", testEmptyRegistryFailsClosed],
    ["valid_offers_resolve", testValidOffersResolve],
    ["client_independence", testClientIndependence],
    ["free_offer_rejected", testFreeOfferRejected],
    ["duplicate_rejected", testDuplicateRejected],
    ["invalid_amount_rejected", testInvalidAmountRejected],
    ["invalid_currency_rejected", testInvalidCurrencyRejected],
    ["empty_provider_reference_rejected", testEmptyProviderReferenceRejected],
    ["disabled_offer_does_not_resolve", testDisabledOfferDoesNotResolve],
    ["unsupported_rejected", testUnsupportedRejected],
    ["enterprise_contact_sales", testEnterpriseContactSales],
    ["portable_placeholder_not_used_by_default", testPortablePlaceholderNotUsedByDefault],
  ];

  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      fn();
      console.log(`PASS  ${name}`);
    } catch (err) {
      failed++;
      console.error(`FAIL  ${name}: ${(err as Error).message}`);
    }
  }

  console.log(
    `\nSELFCHECK COMPLETE — ${assertions} assertions, ${tests.length} cases, ${failed} failed`,
  );
  if (failed > 0) {
    throw new Error(`SELFCHECK FAILED: ${failed}/${tests.length} cases failed`);
  }
}

run();
