import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isTemplateSelectionFrozen } from "../flags";

const ROOT = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(ROOT, file), "utf8");

describe("landing lite template selection flag", () => {
  it("stays frozen when the flag is absent or malformed", () => {
    expect(isTemplateSelectionFrozen({})).toBe(true);
    expect(isTemplateSelectionFrozen({ VITE_LANDING_TEMPLATE_SELECTION_FROZEN: "" })).toBe(true);
    expect(isTemplateSelectionFrozen({ VITE_LANDING_TEMPLATE_SELECTION_FROZEN: "maybe" })).toBe(
      true,
    );
  });

  it("only unfreezes on the exact string false", () => {
    expect(isTemplateSelectionFrozen({ VITE_LANDING_TEMPLATE_SELECTION_FROZEN: "false" })).toBe(
      false,
    );
  });
});

describe("landing launch lite contract", () => {
  it("keeps the sample gallery visible and demonstrative", () => {
    const landing = read("src/components/CripqerLanding.tsx");
    expect(landing).toContain('id="disenos"');
    expect(landing).toContain("Explora nuestros diseños de ejemplo");
    expect(landing).not.toContain("Usar esta");
  });

  it("routes the primary CTA into the real creation flow", () => {
    const landing = read("src/components/CripqerLanding.tsx");
    expect(landing).toContain('data-cta="personalizar-tarjeta"');
    expect(landing).toContain("useStartBaseCard");
    const hook = read("src/features/landing-lite/useStartBaseCard.ts");
    expect(hook).toContain('to: "/pages/$pageId/edit"');
    expect(hook).toContain("createOrResumeInitialLandingPage");
  });

  it("mounts conversational landing and freezes template selection granularly", () => {
    const route = read("src/routes/landing-chat-parity.tsx");
    expect(route).toContain("<ApprovedChatLanding startAt={startAt} />");
    expect(route).not.toContain("return <TemplateSelectionFrozen />");
    const preview = read("src/features/approved-chat-landing/components/TemplatePreview.tsx");
    expect(preview).toContain("isTemplateSelectionFrozen");
    const session = read("src/features/approved-chat-landing/hooks/useCripqerSession.ts");
    expect(session).toContain("isTemplateSelectionFrozen");
    expect(session).toContain(
      "Esa función estará disponible próximamente. Por ahora puedes personalizar tu propia tarjeta.",
    );
  });
});

describe("landing lite V2 sample preview contract", () => {
  it("opens each sample as a read-only preview, never a selection", () => {
    const landing = read("src/components/CripqerLanding.tsx");
    expect(landing).toContain("SampleCardPreview");
    expect(landing).toContain('data-cta="ver-muestra"');
    // The preview must not become a selection surface.
    expect(landing).not.toContain("Usar esta");
    expect(landing).not.toContain("Elegir plantilla");
    expect(landing).not.toContain("Usar plantilla");
  });

  it("shows the same sample the tile shows, and never fabricates a design", () => {
    const preview = read("src/features/landing-lite/SampleCardPreview.tsx");
    // Uses the passed shot when it exists, otherwise the identical mock.
    expect(preview).toContain("shot ?");
    expect(preview).toContain("Nombre Apellido");
    // Required product copy, verbatim.
    expect(preview).toContain(
      "Esta es una muestra de diseño. Puedes comenzar creando y personalizando tu propia tarjeta.",
    );
    // Accessibility: escape closes, focus is managed, no editable fields.
    expect(preview).toContain('event.key === "Escape"');
    expect(preview).toContain('aria-modal="true"');
    expect(preview).not.toContain("<input");
    expect(preview).not.toContain("<form");
  });
});
