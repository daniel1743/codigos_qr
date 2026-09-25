import { describe, expect, it } from "vitest";
import {
  buildPublicLinkTrackEvent,
  isTrackablePublicHref,
  normalizeTrackedLabel,
} from "./publicLinkTracking";

describe("isTrackablePublicHref", () => {
  it("rejects in-page anchors so internal navigation is not tracked", () => {
    expect(isTrackablePublicHref("#tratamientos")).toBe(false);
    expect(isTrackablePublicHref("#proyectos")).toBe(false);
    expect(isTrackablePublicHref("#")).toBe(false);
  });

  it("rejects empty values and the Magic template placeholder", () => {
    expect(isTrackablePublicHref(undefined)).toBe(false);
    expect(isTrackablePublicHref(null)).toBe(false);
    expect(isTrackablePublicHref("")).toBe(false);
    expect(isTrackablePublicHref("   ")).toBe(false);
    expect(isTrackablePublicHref("https://")).toBe(false);
    expect(isTrackablePublicHref("http://")).toBe(false);
  });

  it("accepts real destinations, including mailto/tel", () => {
    expect(isTrackablePublicHref("https://wa.me/34910000000")).toBe(true);
    expect(isTrackablePublicHref("https://instagram.com/clinicaaurea")).toBe(true);
    expect(isTrackablePublicHref("mailto:hola@clinicaaurea.es")).toBe(true);
    expect(isTrackablePublicHref("tel:+34910000000")).toBe(true);
  });
});

describe("normalizeTrackedLabel", () => {
  it("flattens whitespace and drops empty labels", () => {
    expect(normalizeTrackedLabel("  Reservar\n  cita  ")).toBe("Reservar cita");
    expect(normalizeTrackedLabel("\n      ")).toBeNull();
    expect(normalizeTrackedLabel(undefined)).toBeNull();
  });

  it("bounds very long labels", () => {
    const label = normalizeTrackedLabel("a".repeat(400));
    expect(label).not.toBeNull();
    expect(label!.length).toBe(120);
    expect(label!.endsWith("…")).toBe(true);
  });
});

describe("buildPublicLinkTrackEvent", () => {
  it("keeps the stable Magic element identity and the destination", () => {
    expect(
      buildPublicLinkTrackEvent({
        href: "https://wa.me/34910000000",
        itemId: "hero.cta",
        blockId: "hero",
        label: "Botón",
        visibleText: "Reservar cita",
      }),
    ).toEqual({
      type: "link_click",
      itemId: "hero.cta",
      blockId: "hero",
      url: "https://wa.me/34910000000",
      label: "Reservar cita",
    });
  });

  it("falls back to the element label when the anchor has no visible text", () => {
    expect(
      buildPublicLinkTrackEvent({
        href: "https://instagram.com/clinicaaurea",
        itemId: "hero.social.0",
        blockId: "hero",
        label: "Instagram",
        visibleText: "\n      ",
      }),
    ).toEqual({
      type: "link_click",
      itemId: "hero.social.0",
      blockId: "hero",
      url: "https://instagram.com/clinicaaurea",
      label: "Instagram",
    });
  });

  it("returns null for untrackable destinations", () => {
    expect(buildPublicLinkTrackEvent({ href: "#tratamientos", itemId: "hero.cta2" })).toBeNull();
    expect(buildPublicLinkTrackEvent({ href: "https://", itemId: "links.0" })).toBeNull();
    expect(buildPublicLinkTrackEvent({ href: undefined, itemId: "links.1" })).toBeNull();
  });

  it("never collapses two different elements into one identity", () => {
    const hero = buildPublicLinkTrackEvent({
      href: "https://wa.me/34910000000",
      itemId: "hero.cta",
      blockId: "hero",
      label: "Reservar",
    });
    const links = buildPublicLinkTrackEvent({
      href: "https://wa.me/34910000000",
      itemId: "links.0",
      blockId: "links",
      label: "Escríbeme",
    });
    expect(hero?.itemId).toBe("hero.cta");
    expect(links?.itemId).toBe("links.0");
    expect(hero?.itemId).not.toBe(links?.itemId);
  });

  it("omits optional metadata instead of sending empty strings", () => {
    const event = buildPublicLinkTrackEvent({
      href: "https://example.com",
      itemId: "links.2",
      visibleText: "   ",
      label: undefined,
    });
    expect(event).toEqual({
      type: "link_click",
      itemId: "links.2",
      url: "https://example.com",
    });
    expect("blockId" in (event ?? {})).toBe(false);
    expect("label" in (event ?? {})).toBe(false);
  });
});
