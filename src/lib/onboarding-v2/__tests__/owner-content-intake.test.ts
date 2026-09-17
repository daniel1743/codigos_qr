import { describe, expect, it } from "vitest";

import {
  addMenuItem,
  addPortfolioItem,
  addProduct,
  addService,
  createEmptyOwnerContentIntake,
  createOwnerContentIntake,
  exportOwnerContent,
  getOwnerContent,
  getReadiness,
  removeProduct,
  removeService,
  reorderServices,
  setBusinessName,
  setContact,
  setCover,
  updateService,
  validateOwnerContentIntake,
} from "../owner-content-intake";

const image = (url = "https://cdn.example.com/owner.jpg") => ({ url, kind: "image" as const });

describe("shared owner-content intake state", () => {
  it("initializes empty and hydrates the existing OwnerContentInput", () => {
    const empty = createEmptyOwnerContentIntake();
    expect(getOwnerContent(empty)).toEqual({});
    expect(exportOwnerContent(empty).ok).toBe(true);

    const hydrated = createOwnerContentIntake({
      identity: { businessName: "Café Norte" },
      services: [{ id: "service-1", name: "Capuchino", price: "$3.500" }],
    });
    expect(hydrated.services[0]?.localId).toBe("intake-services-1");
    expect(getOwnerContent(hydrated)).toEqual({
      identity: { businessName: "Café Norte" },
      services: [{ id: "service-1", name: "Capuchino", price: "$3.500" }],
    });
  });

  it("supports service add/update/remove/reorder and keeps optional omissions absent", () => {
    let state = createEmptyOwnerContentIntake();
    state = addService(state, { name: "Corte" });
    state = addService(state, { name: "Barba", description: "Perfilado" });
    const firstLocalId = state.services[0]?.localId as string;
    state = updateService(state, firstLocalId, { price: "$8.000" });
    state = reorderServices(state, 0, 1);
    expect(state.services[1]?.localId).toBe(firstLocalId);
    expect(getOwnerContent(state).services).toEqual([
      { name: "Barba", description: "Perfilado" },
      { name: "Corte", price: "$8.000" },
    ]);
    state = removeService(state, firstLocalId);
    expect(getOwnerContent(state).services).toEqual([{ name: "Barba", description: "Perfilado" }]);
  });

  it("supports products without inventing commerce facts", () => {
    let state = createEmptyOwnerContentIntake();
    state = addProduct(state, {
      name: "Maceta",
      price: "$19.990",
      media: [image()],
      destination: "https://tienda.example/maceta",
    });
    const content = getOwnerContent(state);
    expect(content.products?.[0]).toEqual({
      name: "Maceta",
      price: "$19.990",
      media: [image()],
      destination: "https://tienda.example/maceta",
    });
    expect(JSON.stringify(content)).not.toMatch(/stock|sku|discount|checkout|rating|review/i);
    state = removeProduct(state, state.products[0]?.localId as string);
    expect(getOwnerContent(state).products).toBeUndefined();
  });

  it("preserves menu category and price", () => {
    const state = addMenuItem(createEmptyOwnerContentIntake(), {
      name: "Capuchino",
      category: "Cafés",
      price: "$3.500",
    });
    expect(getOwnerContent(state).menuItems?.[0]).toEqual({
      name: "Capuchino",
      category: "Cafés",
      price: "$3.500",
    });
  });

  it("retains an incomplete portfolio draft but does not report it ready", () => {
    const state = addPortfolioItem(createEmptyOwnerContentIntake(), { name: "Boda" });
    expect(getOwnerContent(state).portfolioItems).toEqual([{ name: "Boda" }]);
    expect(validateOwnerContentIntake(state).valid).toBe(true);
    expect(getReadiness(state, "portfolio").ready).toBe(false);
  });

  it("validates and preserves contact facts without fabricating CTA intent", () => {
    let state = setContact(createEmptyOwnerContentIntake(), {
      whatsapp: "+56912345678",
      email: "bad-email",
      bookingUrl: "not-a-url",
    });
    expect(exportOwnerContent(state).ok).toBe(false);
    state = setContact(state, {
      email: "owner@example.com",
      bookingUrl: "https://agenda.example/reservar",
    });
    const exported = exportOwnerContent(state);
    expect(exported.ok).toBe(true);
    expect(exported.content.contact).toEqual({
      whatsapp: "+56912345678",
      email: "owner@example.com",
      bookingUrl: "https://agenda.example/reservar",
    });
    expect(exported.content).not.toHaveProperty("actions");
  });

  it("accepts durable relative media and rejects temporary previews", () => {
    let state = setCover(createEmptyOwnerContentIntake(), {
      url: "/media/cover.jpg",
      kind: "image",
    });
    expect(exportOwnerContent(state).ok).toBe(true);
    state = setCover(state, { url: "blob:http://localhost/preview", kind: "image" });
    const rejected = exportOwnerContent(state);
    expect(rejected.ok).toBe(false);
    expect(rejected.validation.issues.some((issue) => issue.path === "media.cover.url")).toBe(true);
  });

  it("strips intake-only state while retaining owner values", () => {
    const state = setBusinessName(createEmptyOwnerContentIntake(), "  Estudio Norte  ");
    const content = getOwnerContent(state);
    expect(content).toEqual({ identity: { businessName: "Estudio Norte" } });
    expect(content).not.toHaveProperty("dirty");
    expect(content).not.toHaveProperty("revision");
    expect(JSON.stringify(content)).not.toContain("localId");
  });
});
