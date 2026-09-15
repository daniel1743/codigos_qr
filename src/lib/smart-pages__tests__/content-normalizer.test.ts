import { describe, expect, it } from "vitest";
import {
  mergeContent,
  normalizeDrafts,
  parsePrice,
  slugify,
  stableId,
  type CatalogV1,
  type ItemType,
  type NormalizeOptions,
  type SalesMode,
} from "../smart-pages";

function options(
  itemType: ItemType,
  catalogKind: CatalogV1["kind"],
  salesMode: SalesMode,
  businessType = "hairdresser",
): NormalizeOptions {
  return { businessName: "Studio", businessType, itemType, catalogKind, salesMode };
}

describe("content-normalizer (SMART_PAGES_2)", () => {
  it("normalizes the same input to the same output (deterministic)", () => {
    const drafts = [
      {
        source: "csv" as const,
        records: [
          { name: "Corte", price: "$8,000", description: "Real service", category: "Hair" },
        ],
        notes: [],
        warnings: [],
      },
    ];
    expect(normalizeDrafts(drafts, options("service", "services", "booking"))).toEqual(
      normalizeDrafts(drafts, options("service", "services", "booking")),
    );
  });

  it("preserves owner data and parses price without inventing", () => {
    const out = normalizeDrafts(
      [
        {
          source: "csv" as const,
          records: [{ name: "Corte", price: "$8,000", description: "Real service" }],
          notes: [],
          warnings: [],
        },
      ],
      options("service", "services", "booking"),
    );
    expect(out.catalogs[0]?.items[0]?.name).toBe("Corte");
    expect(out.catalogs[0]?.items[0]?.price?.amount).toBe(8000);
    expect(out.catalogs[0]?.items[0]?.description).toBe("Real service");
  });

  it("does not fabricate missing optional data and reports review flags", () => {
    const out = normalizeDrafts(
      [{ source: "text" as const, records: [{ name: "Unknown" }], notes: [], warnings: [] }],
      options("service", "services", "info", "generic"),
    );
    const item = out.catalogs[0]?.items[0];
    expect(item?.price).toBeUndefined();
    expect(item?.description).toBeUndefined();
    expect(item?.review).toEqual(["price", "description", "media"]);
  });

  it("keeps stable item ordering", () => {
    const out = normalizeDrafts(
      [
        {
          source: "json" as const,
          records: [{ name: "A" }, { name: "B" }, { name: "C" }],
          notes: [],
          warnings: [],
        },
      ],
      options("service", "services", "booking"),
    );
    expect(out.catalogs[0]?.items.map((i) => i.name)).toEqual(["A", "B", "C"]);
  });

  it("slugify, stableId and parsePrice are deterministic", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
    expect(stableId("itm", "Hello World", 0)).toBe("itm_hello-world_0");
    expect(parsePrice("10 USD")).toEqual({ amount: 10, label: "10 USD", currency: "USD" });
    expect(parsePrice("on request")).toEqual({ label: "on request" });
  });

  it("mergeContent lets host-supplied facts win", () => {
    const base = normalizeDrafts(
      [{ source: "text" as const, records: [{ name: "X" }], notes: [], warnings: [] }],
      options("service", "services", "booking"),
    );
    const merged = mergeContent(base, { business: { ...base.business, about: "Owner bio" } });
    expect(merged.business.about).toBe("Owner bio");
    expect(merged.business.name).toBe("Studio");
  });
});
