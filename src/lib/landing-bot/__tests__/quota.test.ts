import { describe, expect, it } from "vitest";
import {
  createInMemoryQuota,
  currentQuotaPeriod,
  LANDING_BOT_FREE_MONTHLY_LIMIT,
  LANDING_BOT_PRO_MONTHLY_LIMIT,
  landingBotMonthlyLimit,
} from "../quota";

describe("landing bot quota primitives", () => {
  it("formats the period as YYYY-MM in UTC", () => {
    expect(currentQuotaPeriod(new Date(Date.UTC(2026, 0, 15)))).toBe("2026-01");
    expect(currentQuotaPeriod(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-12");
  });

  it("resolves the monthly limit by tier", () => {
    expect(landingBotMonthlyLimit("free")).toBe(LANDING_BOT_FREE_MONTHLY_LIMIT);
    expect(landingBotMonthlyLimit("pro")).toBe(LANDING_BOT_PRO_MONTHLY_LIMIT);
    expect(landingBotMonthlyLimit("business")).toBe(LANDING_BOT_PRO_MONTHLY_LIMIT);
    expect(landingBotMonthlyLimit("enterprise")).toBe(LANDING_BOT_PRO_MONTHLY_LIMIT);
    expect(landingBotMonthlyLimit(undefined as unknown as string)).toBe(LANDING_BOT_FREE_MONTHLY_LIMIT);
  });

  it("in-memory store increments monotonically per key", () => {
    const store = createInMemoryQuota();
    expect(store.increment("p:2026-01")).toBe(1);
    expect(store.increment("p:2026-01")).toBe(2);
    expect(store.peek("p:2026-01")).toBe(2);
    expect(store.peek("other")).toBe(0);
    store.reset();
    expect(store.peek("p:2026-01")).toBe(0);
  });
});
