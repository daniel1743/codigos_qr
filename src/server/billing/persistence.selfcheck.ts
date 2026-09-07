import {
  claimBillingEvent,
  getBillingCheckoutByProviderCheckoutId,
  getBillingCheckoutForUser,
  getBillingCustomerByProviderCustomerId,
  markBillingEventFailed,
} from "./persistence.ts";

type RecordedCall = { table: string; operation: string; values: Record<string, unknown> };

type MockCustomerRecord = {
  id: string;
  user_id: string;
  provider: string;
  provider_customer_id: string;
  created_at: string;
  updated_at: string;
};

type MockCheckoutRecord = {
  id: string;
  user_id: string;
  provider: string;
  plan_id: string;
  billing_interval: string;
  provider_checkout_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

function matchesFilters(filters: Record<string, unknown>, row: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (row[key] !== value) return false;
  }
  return true;
}

type MockOptions = {
  checkoutUserId?: string;
  claimResult?: boolean;
  customers?: MockCustomerRecord[];
  checkouts?: MockCheckoutRecord[];
};

function createMockClient(options: MockOptions = {}): {
  client: never;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];

  const defaultCheckout: MockCheckoutRecord = {
    id: "checkout-a",
    user_id: options.checkoutUserId ?? "user-a",
    provider: "stripe",
    plan_id: "pro",
    billing_interval: "monthly",
    provider_checkout_id: null,
    status: "processing",
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
    expires_at: null,
  };
  const customers = options.customers ?? [];
  const checkouts = [defaultCheckout, ...(options.checkouts ?? [])];

  const client = {
    from(table: string) {
      const state = { filters: {} as Record<string, unknown> };
      const builder = {
        select() {
          calls.push({ table, operation: "select", values: {} });
          return builder;
        },
        eq(column: string, value: unknown) {
          state.filters[column] = value;
          return builder;
        },
        maybeSingle: async () => {
          let data: unknown = null;
          if (table === "billing_customers") {
            data =
              customers.find((row) =>
                matchesFilters(state.filters, row as unknown as Record<string, unknown>),
              ) ?? null;
          } else if (table === "billing_checkouts") {
            data =
              checkouts.find((row) =>
                matchesFilters(state.filters, row as unknown as Record<string, unknown>),
              ) ?? null;
          }
          return { data, error: null };
        },
        update(values: Record<string, unknown>) {
          calls.push({ table, operation: "update", values });
          return {
            eq() {
              return {
                eq() {
                  return {
                    select() {
                      return {
                        single: async () => ({
                          data: {
                            id: "event-a",
                            provider: "stripe",
                            event_id: "evt-a",
                            status: values["status"],
                            received_at: "2026-09-03T00:00:00.000Z",
                            processed_at: null,
                            error_code: values["error_code"] ?? null,
                            diagnostic_reference: values["diagnostic_reference"] ?? null,
                          },
                          error: null,
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
      return builder;
    },
    rpc(name: string, values: Record<string, unknown>) {
      calls.push({ table: name, operation: "rpc", values });
      return Promise.resolve({ data: options.claimResult ?? true, error: null });
    },
  } as never;

  return { client, calls };
}

export async function runBillingPersistenceSelfCheck(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  const assert = (condition: boolean) => {
    if (condition) passed += 1;
    else failed += 1;
  };

  const checkoutMock = createMockClient({ checkoutUserId: "user-a" });
  assert(Boolean(await getBillingCheckoutForUser("checkout-a", "user-a", checkoutMock.client)));
  assert((await getBillingCheckoutForUser("checkout-a", "user-b", checkoutMock.client)) === null);

  const claimMock = createMockClient({ claimResult: true });
  assert(await claimBillingEvent("stripe", "evt-123", claimMock.client));
  assert(claimMock.calls[0]?.values["p_provider"] === "stripe");
  assert(claimMock.calls[0]?.values["p_event_id"] === "evt-123");

  const failedMock = createMockClient();
  await markBillingEventFailed(
    "stripe",
    "evt-123",
    {
      error_code: "SAFE_FAILURE",
      diagnostic_reference: "trace-123",
    },
    failedMock.client,
  );
  const update = failedMock.calls.find((call) => call.operation === "update");
  assert(update?.values["status"] === "failed");
  assert(!Object.prototype.hasOwnProperty.call(update?.values ?? {}, "raw_payload"));

  // --- New first-purchase reverse-lookup assertions ---
  const customerA: MockCustomerRecord = {
    id: "cust-a",
    user_id: "user-a",
    provider: "mercado_pago",
    provider_customer_id: "mp-cust-a",
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
  };
  const customerB: MockCustomerRecord = {
    id: "cust-b",
    user_id: "user-b",
    provider: "paypal",
    provider_customer_id: "pp-cust-b",
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
  };
  const customerSharedMp: MockCustomerRecord = {
    id: "cust-shared-mp",
    user_id: "user-a",
    provider: "mercado_pago",
    provider_customer_id: "shared-cust",
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
  };
  const customerSharedPp: MockCustomerRecord = {
    id: "cust-shared-pp",
    user_id: "user-b",
    provider: "paypal",
    provider_customer_id: "shared-cust",
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
  };

  const lookupMock = createMockClient({
    customers: [customerA, customerB, customerSharedMp, customerSharedPp],
    checkouts: [],
  });

  // Customer reverse lookup.
  const custA = await getBillingCustomerByProviderCustomerId("mercado_pago", "mp-cust-a", lookupMock.client);
  assert(custA !== null);
  assert(custA?.user_id === "user-a");

  const custB = await getBillingCustomerByProviderCustomerId("paypal", "pp-cust-b", lookupMock.client);
  assert(custB !== null);
  assert(custB?.user_id === "user-b");

  assert((await getBillingCustomerByProviderCustomerId("mercado_pago", "unknown", lookupMock.client)) === null);
  assert((await getBillingCustomerByProviderCustomerId("mercado_pago", "pp-cust-b", lookupMock.client)) === null);

  // Isolation: same-looking customer IDs across providers stay provider-scoped.
  const sharedCustMp = await getBillingCustomerByProviderCustomerId("mercado_pago", "shared-cust", lookupMock.client);
  const sharedCustPp = await getBillingCustomerByProviderCustomerId("paypal", "shared-cust", lookupMock.client);
  assert(sharedCustMp?.user_id === "user-a");
  assert(sharedCustPp?.user_id === "user-b");

  const checkoutA: MockCheckoutRecord = {
    id: "chk-a",
    user_id: "user-a",
    provider: "mercado_pago",
    plan_id: "pro",
    billing_interval: "monthly",
    provider_checkout_id: "mp-chk-a",
    status: "success",
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
    expires_at: null,
  };
  const checkoutB: MockCheckoutRecord = {
    id: "chk-b",
    user_id: "user-b",
    provider: "paypal",
    plan_id: "pro",
    billing_interval: "monthly",
    provider_checkout_id: "pp-chk-b",
    status: "success",
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
    expires_at: null,
  };
  const checkoutSharedMp: MockCheckoutRecord = {
    id: "chk-shared-mp",
    user_id: "user-a",
    provider: "mercado_pago",
    plan_id: "pro",
    billing_interval: "monthly",
    provider_checkout_id: "shared-chk",
    status: "success",
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
    expires_at: null,
  };
  const checkoutSharedPp: MockCheckoutRecord = {
    id: "chk-shared-pp",
    user_id: "user-b",
    provider: "paypal",
    plan_id: "pro",
    billing_interval: "monthly",
    provider_checkout_id: "shared-chk",
    status: "success",
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
    expires_at: null,
  };

  const checkoutLookupMock = createMockClient({
    customers: [],
    checkouts: [checkoutA, checkoutB, checkoutSharedMp, checkoutSharedPp],
  });

  // Checkout reverse lookup.
  const chkA = await getBillingCheckoutByProviderCheckoutId("mercado_pago", "mp-chk-a", checkoutLookupMock.client);
  assert(chkA !== null);
  assert(chkA?.user_id === "user-a");

  const chkB = await getBillingCheckoutByProviderCheckoutId("paypal", "pp-chk-b", checkoutLookupMock.client);
  assert(chkB !== null);
  assert(chkB?.user_id === "user-b");

  assert((await getBillingCheckoutByProviderCheckoutId("mercado_pago", "unknown", checkoutLookupMock.client)) === null);
  assert((await getBillingCheckoutByProviderCheckoutId("paypal", "mp-chk-a", checkoutLookupMock.client)) === null);

  // Isolation: same-looking checkout IDs across providers stay provider-scoped.
  const sharedChkMp = await getBillingCheckoutByProviderCheckoutId("mercado_pago", "shared-chk", checkoutLookupMock.client);
  const sharedChkPp = await getBillingCheckoutByProviderCheckoutId("paypal", "shared-chk", checkoutLookupMock.client);
  assert(sharedChkMp?.user_id === "user-a");
  assert(sharedChkPp?.user_id === "user-b");

  return { passed, failed };
}
