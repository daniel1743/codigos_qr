// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { MagicPublicRenderer } from "../MagicPublicRenderer";
import { createInitialMagicPageDocument, hydrateMagicEditorState } from "../magic-document";
import { EditorProvider } from "../../../isolated/magic-page-editor/contexts/EditorContext";
import { TemplateRenderer } from "../../../isolated/magic-page-editor/components/templates/TemplateRenderer";
import { Editable } from "../../../isolated/magic-page-editor/components/editor/Editable";
import { resolveCanonicalClickType } from "../../../lib/analytics";
import type { PublicLinkTrackEvent } from "../../../isolated/magic-page-editor/utils/publicLinkTracking";

type TrackFn = (event: PublicLinkTrackEvent) => void;

const WHATSAPP = "https://wa.me/34910000000";
const INTERNAL = "#tratamientos";
const INSTAGRAM = "https://instagram.com/clinicaaurea";
const WEBSITE = "https://clinicaaurea.es";
const PLACEHOLDER = "https://";

/** The Business starter is the Magic canary shape: wa.me CTAs + a #anchor CTA. */
const BUSINESS_DOCUMENT = createInitialMagicPageDocument("business");
const BUSINESS_STATE = hydrateMagicEditorState(BUSINESS_DOCUMENT);

function tracked(onTrack: Mock<TrackFn>): PublicLinkTrackEvent[] {
  return onTrack.mock.calls.map((call) => call[0]);
}

describe("Magic public page analytics (preview)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    // happy-dom would otherwise follow the clicked anchors (real navigation).
    // Only the click → callback contract matters here.
    const happyWindow = window as unknown as {
      happyDOM?: { settings?: { navigation?: { disableMainFrameNavigation?: boolean } } };
    };
    if (happyWindow.happyDOM?.settings?.navigation) {
      happyWindow.happyDOM.settings.navigation.disableMainFrameNavigation = true;
    }
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderPublic = (onTrack?: TrackFn) => {
    act(() => {
      root.render(<MagicPublicRenderer document={BUSINESS_DOCUMENT} onTrack={onTrack} />);
    });
  };

  const anchor = (href: string): Element | null => container.querySelector(`a[href="${href}"]`);

  const click = (element: Element): MouseEvent => {
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      element.dispatchEvent(event);
    });
    return event;
  };


  it("emits exactly ONE canonical event for a WhatsApp CTA click", () => {
    const onTrack = vi.fn<TrackFn>();
    renderPublic(onTrack);

    const whatsapp = anchor(WHATSAPP);
    expect(whatsapp).not.toBeNull();

    click(whatsapp!);

    expect(onTrack).toHaveBeenCalledTimes(1);
    const [event] = tracked(onTrack);
    expect(event).toBeDefined();
    // The existing canonical resolver — not Magic — decides the platform.
    expect(resolveCanonicalClickType(event!.type, event!.url)).toBe("whatsapp_click");
  });

  it("sends the destination URL plus stable Magic identity metadata", () => {
    const onTrack = vi.fn<TrackFn>();
    renderPublic(onTrack);

    click(anchor(WHATSAPP)!);

    const [event] = tracked(onTrack);
    expect(event).toMatchObject({
      type: "link_click",
      url: WHATSAPP,
      itemId: "hero.cta",
      blockId: "hero",
    });
    expect(typeof event?.label).toBe("string");
    expect((event?.label ?? "").length).toBeGreaterThan(0);
    expect((event?.label ?? "").length).toBeLessThanOrEqual(120);
  });

  it("never tracks internal #anchor navigation as an external click", () => {
    const onTrack = vi.fn<TrackFn>();
    renderPublic(onTrack);

    const internal = anchor(INTERNAL);
    expect(internal).not.toBeNull();

    click(internal!);

    expect(onTrack).not.toHaveBeenCalled();
  });

  it("does not prevent normal anchor navigation", () => {
    const onTrack = vi.fn<TrackFn>();
    renderPublic(onTrack);

    const whatsapp = anchor(WHATSAPP)!;
    expect(whatsapp.getAttribute("href")).toBe(WHATSAPP);
    expect(whatsapp.getAttribute("target")).toBe("_blank");

    const event = click(whatsapp);

    expect(event.defaultPrevented).toBe(false);
    expect(onTrack).toHaveBeenCalledTimes(1);
  });


  it("routes Instagram and generic destinations through the canonical resolver", () => {
    const onTrack = vi.fn<TrackFn>();
    renderPublic(onTrack);

    click(anchor(INSTAGRAM)!);
    click(anchor(WEBSITE)!);

    const events = tracked(onTrack);
    expect(events).toHaveLength(2);
    expect(resolveCanonicalClickType(events[0]!.type, events[0]!.url)).toBe("instagram_click");
    expect(events[0]!.itemId).toContain("social");
    expect(resolveCanonicalClickType(events[1]!.type, events[1]!.url)).toBe("external_link_click");
    expect(events[0]!.itemId).not.toBe(events[1]!.itemId);
  });

  it("ignores the untouched `https://` placeholder and non-anchor elements", () => {
    const onTrack = vi.fn<TrackFn>();
    act(() => {
      root.render(
        <EditorProvider initialDocument={BUSINESS_STATE} initialMode="preview" onTrack={onTrack}>
          <Editable id="links.0" kind="cta" label="Botón" blockKey="links" as="a" href={PLACEHOLDER}>
            Sin destino
          </Editable>
          <Editable id="hero.cta2" kind="cta" label="Botón" blockKey="hero" as="a" href="#top">
            Ir arriba
          </Editable>
          <Editable id="text.0" kind="text" label="Texto" blockKey="text" as="div">
            Texto
          </Editable>
        </EditorProvider>,
      );
    });

    click(anchor(PLACEHOLDER)!);
    click(anchor("#top")!);

    const nonAnchor = container.querySelector("div");
    expect(nonAnchor).not.toBeNull();
    click(nonAnchor!);

    expect(onTrack).not.toHaveBeenCalled();
  });

  it("emits once per click for a plain Editable anchor too", () => {
    const onTrack = vi.fn<TrackFn>();
    act(() => {
      root.render(
        <EditorProvider initialDocument={BUSINESS_STATE} initialMode="preview" onTrack={onTrack}>
          <Editable id="links.0" kind="cta" label="Reservar" blockKey="links" as="a" href={WHATSAPP}>
            Reservar cita
          </Editable>
        </EditorProvider>,
      );
    });

    click(anchor(WHATSAPP)!);

    expect(onTrack).toHaveBeenCalledTimes(1);
    expect(tracked(onTrack)[0]).toEqual({
      type: "link_click",
      itemId: "links.0",
      blockId: "links",
      url: WHATSAPP,
      label: "Reservar cita",
    });
  });

  it("counts a single click once even when it lands on nested content", () => {
    const onTrack = vi.fn<TrackFn>();
    renderPublic(onTrack);

    const whatsapp = anchor(WHATSAPP)!;
    const nested = whatsapp.querySelector("span, svg") ?? whatsapp;

    const event = click(nested);

    expect(event.defaultPrevented).toBe(false);
    expect(onTrack).toHaveBeenCalledTimes(1);
  });

  it("emits nothing when the host does not provide an analytics callback", () => {
    expect(() => renderPublic()).not.toThrow();
    const whatsapp = anchor(WHATSAPP);
    expect(whatsapp).not.toBeNull();
    expect(() => click(whatsapp!)).not.toThrow();
  });

  it("strict canary scope: the same click emits only while the host wires onTrack", () => {
    const onTrack = vi.fn<TrackFn>();

    // Canonical analytics ENABLED for this page (the canary): the route passes
    // handleTrack, so one click produces exactly one canonical event.
    renderPublic(onTrack);
    click(anchor(WHATSAPP)!);
    expect(onTrack).toHaveBeenCalledTimes(1);
    const [event] = tracked(onTrack);
    expect(resolveCanonicalClickType(event!.type, event!.url)).toBe("whatsapp_click");

    // Canonical analytics DISABLED / non-allowlisted: the route passes
    // onTrack={undefined}, so the identical click keeps the previous behaviour
    // (no analytics at all — no canonical write, no legacy write).
    renderPublic(undefined);
    click(anchor(WHATSAPP)!);
    expect(onTrack).toHaveBeenCalledTimes(1);
  });

  it("keeps edit mode analytics-free and preserves editor click handling", () => {
    const onTrack = vi.fn<TrackFn>();
    act(() => {
      root.render(
        <EditorProvider initialDocument={BUSINESS_STATE} initialMode="edit" onTrack={onTrack}>
          <TemplateRenderer />
        </EditorProvider>,
      );
    });

    const whatsapp = anchor(WHATSAPP);
    expect(whatsapp).not.toBeNull();

    const event = click(whatsapp!);

    expect(onTrack).not.toHaveBeenCalled();
    // Editor behaviour is unchanged: the click is consumed by the editor.
    expect(event.defaultPrevented).toBe(true);
  });
});
