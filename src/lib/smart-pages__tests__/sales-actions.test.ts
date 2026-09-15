import { describe, expect, it } from "vitest";
import {
  action,
  actionHref,
  buildWhatsAppMessage,
  defaultLabel,
  resolveItemAction,
  sanitizePhone,
  type CatalogItemV1,
} from "../smart-pages";

function item(overrides: Partial<CatalogItemV1> = {}): CatalogItemV1 {
  return {
    id: "i1",
    type: "service",
    name: "Corte",
    media: [],
    attributes: [],
    salesMode: "contact",
    featured: false,
    enabled: true,
    confidence: 1,
    review: [],
    ...overrides,
  };
}

describe("sales-actions (SMART_PAGES_2)", () => {
  it("sanitizes phone to digits only", () => {
    expect(sanitizePhone("+56 9-1234.5678")).toBe("56912345678");
  });

  it("builds a deterministic WhatsApp message including a real price", () => {
    const i = item({ price: { amount: 8000, label: "$8,000" } });
    const msg = buildWhatsAppMessage({ businessName: "Studio", phone: "56987654321", item: i });
    expect(msg).toContain("Corte");
    expect(msg).toContain("$8,000");
    expect(msg).toBe(
      buildWhatsAppMessage({ businessName: "Studio", phone: "56987654321", item: i }),
    );
  });

  it("keeps WhatsApp mapping semantic (no invented phone)", () => {
    const href = actionHref(action("whatsapp", "Order"), {
      businessName: "Studio",
      contactWhatsapp: "56987654321",
    });
    expect(href).toContain("https://wa.me/56987654321");
  });

  it("lets the explicit owner action win over fallback semantics", () => {
    const i = item({
      action: action("external_url", "Website", "https://example.com"),
      salesMode: "contact",
    });
    const resolved = resolveItemAction(i, { businessName: "Studio" });
    expect(resolved.action.kind).toBe("external_url");
    expect(resolved.href).toBe("https://example.com");
    expect(resolved.source).toBe("item_action");
  });

  it("resolves quote/contact fallback deterministically", () => {
    const viaEmail = actionHref(action("quote", "Request quote"), {
      businessName: "Studio",
      contactEmail: "hola@studio.cl",
    });
    expect(viaEmail).toContain("mailto:hola@studio.cl");

    const viaWhatsapp = actionHref(action("quote", "Request quote"), {
      businessName: "Studio",
      contactWhatsapp: "56987654321",
    });
    expect(viaWhatsapp).toContain("https://wa.me/56987654321");

    const viaPhone = actionHref(action("contact", "Contact"), {
      businessName: "Studio",
      contactPhone: "56912345678",
    });
    expect(viaPhone).toBe("tel:+56912345678");
  });

  it("produces a diagnostic/fallback for unsafe or missing targets, not invention", () => {
    expect(
      actionHref(action("external_url", "Link", "javascript:alert(1)"), {
        businessName: "Studio",
      }),
    ).toBeUndefined();
    expect(actionHref(action("whatsapp", "Order"), { businessName: "Studio" })).toBeUndefined();
    expect(actionHref(undefined, { businessName: "Studio" })).toBeUndefined();
    expect(actionHref(action("checkout", "Checkout"), { businessName: "Studio" })).toBeUndefined();
  });

  it("returns stable action labels", () => {
    expect(defaultLabel("whatsapp")).toBe("WhatsApp");
    expect(defaultLabel("quote")).toBe("Request quote");
  });
});
