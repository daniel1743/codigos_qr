import {
  claimBillingEvent,
  getBillingCheckoutForUser,
  markBillingEventFailed,
} from "./persistence.ts";

type RecordedCall = { table: string; operation: string; values: Record<string, unknown> };

function createMockClient(options: { checkoutUserId?: string; claimResult?: boolean } = {}): {
  client: never;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];

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
        maybeSingle: async () => ({
          data:
            state.filters["user_id"] === options.checkoutUserId
              ? {
                  id: "checkout-a",
                  user_id: options.checkoutUserId,
                  provider: "stripe",
                  plan_id: "pro",
                  billing_interval: "monthly",
                  provider_checkout_id: null,
                  status: "processing",
                  created_at: "2026-09-03T00:00:00.000Z",
                  updated_at: "2026-09-03T00:00:00.000Z",
                  expires_at: null,
                }
              : null,
          error: null,
        }),
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

  return { passed, failed };
}
