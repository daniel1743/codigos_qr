import { describe, expect, it } from "vitest";

import {
  classifyBusinessCategory,
  classifyGoal,
  classifyPersonality,
  classifyTransformation,
  reauthored,
} from "../classify";

describe("transformation classifier", () => {
  it("classifies preserved, lost, fallback and degraded", () => {
    expect(classifyTransformation("x", "a", "a").status).toBe("PRESERVED");
    expect(classifyTransformation("x", "a", undefined).status).toBe("LOST");
    expect(classifyTransformation("x", undefined, "a").status).toBe("FALLBACK");
    expect(classifyTransformation("x", "a", "b").status).toBe("DEGRADED");
  });

  it("detects category collapse to 'other'", () => {
    const t = classifyBusinessCategory("Tienda de ropa", "other");
    expect(t.status).toBe("DEGRADED");
    expect(t.note).toContain("other");
  });

  it("detects personality fallback", () => {
    const t = classifyPersonality(undefined, "professional");
    expect(t.status).toBe("FALLBACK");
  });

  it("detects goal degradation bookings -> leads", () => {
    const t = classifyGoal("bookings", "leads");
    expect(t.status).toBe("DEGRADED");
  });

  it("marks engine-authored values as REAUTHORED", () => {
    expect(reauthored("visual family", "editorial").status).toBe("REAUTHORED");
  });
});
