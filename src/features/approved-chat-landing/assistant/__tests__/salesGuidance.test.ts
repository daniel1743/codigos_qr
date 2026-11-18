import { describe, expect, it } from "vitest";
import { ensureLandingValue, LANDING_VALUE_LINE } from "../salesGuidance";

describe("landing sales guidance", () => {
  it("adds the free features and metrics value when the model omits it", () => {
    const result = ensureLandingValue("Cuéntame qué tipo de negocio tienes.");

    expect(result).toContain(LANDING_VALUE_LINE);
    expect(result).toMatch(/gratis|gratuitas/);
    expect(result).toMatch(/m[eé]tricas/);
  });

  it("does not duplicate the value proposition when it is already present", () => {
    const answer = `Puedes centralizar tus enlaces y revisar métricas gratuitas. ${LANDING_VALUE_LINE}`;

    expect(ensureLandingValue(answer)).toBe(answer);
  });
});
