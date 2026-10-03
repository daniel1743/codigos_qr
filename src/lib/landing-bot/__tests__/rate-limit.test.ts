import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../rate-limit";

describe("landing bot rate limit", () => {
  it("allows up to max then blocks within the window", () => {
    let t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 3, now: () => t });
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });

  it("resets after the window elapses", () => {
    let t = 0;
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(false);
    t = 1000;
    expect(limiter.check("a")).toBe(true);
  });

  it("isolates keys from each other", () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => 0 });
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("b")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });
});
