import { describe, expect, it } from "vitest";

import {
  getOwnerContentReadiness,
  ownerContentFromGeneratedPageInput,
  ownerContentToEngineContentBlocks,
  ownerContentToNormalizedContent,
  ownerContentToPageGenerationRequest,
  validateOwnerContentInput,
  type OwnerContentInput,
} from "../owner-content";
import type { GeneratedPageInput } from "../types";

const image = (url = "https://cdn.example.com/owner.jpg") => ({ url, kind: "image" as const });

describe("shared OwnerContentInput contract", () => {
  it("accepts absent and partial owner content without global requirements", () => {
    expect(validateOwnerContentInput({}).valid).toBe(true);
    expect(validateOwnerContentInput({ products: [{ name: "Producto sin precio" }] }).valid).toBe(
      true,
    );
    expect(validateOwnerContentInput({ contact: { email: "owner@example.com" } }).valid).toBe(true);
  });

  it("rejects malformed owner facts and non-durable media", () => {
    const result = validateOwnerContentInput({
      services: [{ name: "", price: 100 }],
      media: { cover: { url: "blob:http://localhost/preview", kind: "image" } },
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "services[0].name" }),
        expect.objectContaining({ path: "services[0].price" }),
        expect.objectContaining({ path: "media.cover.url", code: "invalid_asset_ref" }),
      ]),
    );
  });

  it("preserves supplied prices, destinations and media while leaving omissions absent", () => {
    const owner: OwnerContentInput = {
      identity: { businessName: "Tienda Norte" },
      products: [
        {
          name: "Maceta azul",
          price: "$19.990",
          media: [image("https://cdn.example.com/maceta.jpg")],
          destination: "https://tienda.example/maceta",
        },
        { name: "Producto sin precio" },
      ],
      portfolioItems: [
        { name: "Proyecto real", media: [image()], destination: "https://owner.example/proyecto" },
      ],
    };
    const normalized = ownerContentToNormalizedContent(owner, { businessType: "retail" });
    const productCatalog = normalized.catalogs.find((catalog) => catalog.kind === "catalog");
    expect(productCatalog?.items[0]?.price).toEqual({ label: "$19.990" });
    expect(productCatalog?.items[1]?.price).toBeUndefined();
    expect(productCatalog?.items[0]?.media[0]?.url).toBe("https://cdn.example.com/maceta.jpg");
    expect(productCatalog?.items[0]?.action?.target).toBe("https://tienda.example/maceta");
  });

  it("maps the current /pages/new input to the same shared contract", () => {
    const input: GeneratedPageInput = {
      objective: "menu",
      title: "Carta",
      businessName: "Café Norte",
      activity: "Cafetería",
      description: "Café de especialidad.",
      coverImageUrl: "https://cdn.example.com/cover.jpg",
      cta: { type: "whatsapp", value: "+56912345678" },
      items: [
        { title: "Capuchino", price: "$3.500", imageUrl: "https://cdn.example.com/cafe.jpg" },
      ],
    };
    const owner = ownerContentFromGeneratedPageInput(input);
    expect(owner.identity).toEqual({
      businessName: "Café Norte",
      shortDescription: "Café de especialidad.",
    });
    expect(owner.menuItems?.[0]).toMatchObject({ name: "Capuchino", price: "$3.500" });
    expect(owner.media?.cover?.url).toBe("https://cdn.example.com/cover.jpg");
    expect(owner.contact).toEqual({ whatsapp: "+56912345678" });
    expect(ownerContentToEngineContentBlocks(owner)?.services?.[0]).toMatchObject({
      title: "Capuchino",
      price: "$3.500",
    });
  });

  it("projects owner facts to PageGenerationRequest without activating generation", () => {
    const request = ownerContentToPageGenerationRequest(
      { identity: { businessName: "Estudio Norte" }, services: [{ name: "Sesión" }] },
      {
        businessType: "photography",
        goal: "book",
        density: "balanced",
        salesMode: "booking",
        primaryAction: {
          kind: "external_booking",
          label: "Reservar",
          target: "https://agenda.example/reservar",
          enabled: true,
        },
        experienceType: "services",
      },
    );
    expect(request.version).toBe("1");
    expect(request.content.business.name).toBe("Estudio Norte");
    expect(request.content.catalogs[0]?.items[0]?.name).toBe("Sesión");
    expect(request.primaryAction.target).toBe("https://agenda.example/reservar");
  });
});

describe("OwnerContentInput conditional readiness", () => {
  it.each([
    ["services", { services: [{ name: "Corte" }] }, true],
    ["catalog", { products: [{ name: "Maceta" }] }, true],
    ["menu", { menuItems: [{ name: "Capuchino" }] }, true],
    ["portfolio", { portfolioItems: [{ name: "Boda", media: [image()] }] }, true],
  ] as const)("reports readiness for %s", (experience, owner, ready) => {
    expect(getOwnerContentReadiness(owner as unknown as OwnerContentInput, experience).ready).toBe(
      ready,
    );
  });

  it("does not claim portfolio readiness without owner media", () => {
    const result = getOwnerContentReadiness(
      { portfolioItems: [{ name: "Trabajo", media: [] }] },
      "portfolio",
    );
    expect(result.ready).toBe(false);
    expect(result.issues[0]?.path).toBe("portfolioItems");
  });
});
