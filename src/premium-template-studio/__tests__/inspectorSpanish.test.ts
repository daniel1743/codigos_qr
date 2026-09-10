import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { powerEditorMessages } from "../i18n/messages";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inspectorSource = readFileSync(
  resolve(__dirname, "../components/inspector/Inspector.tsx"),
  "utf8",
);

const profileInspectorSource = inspectorSource.slice(
  inspectorSource.indexOf("function ProfileInspector()"),
  inspectorSource.indexOf("function ItemsEditor("),
);

describe("Right Inspector Spanish copy", () => {
  it("keeps the profile/page Inspector labels in the Spanish authority", () => {
    const { inspector, options } = powerEditorMessages.es;

    expect(inspector.pageBackground).toBe("Fondo");
    expect(inspector.coverBanner).toBe("Portada / Banner");
    expect(inspector.profile).toBe("Perfil");
    expect(inspector.avatar).toBe("Foto de perfil");
    expect(inspector.containerLayout).toBe("Diseño del contenedor");
    expect(inspector.tipBody).toBe("Selecciona cualquier elemento del lienzo para editarlo aquí.");
    expect(options.solid).toBe("Sólido");
    expect(options.gradient).toBe("Degradado");
    expect(options.grid).toBe("Cuadrícula");
    expect(options.start).toBe("Inicio");
    expect(options.stretch).toBe("Estirar");
  });

  it("wires profile/card/video/advanced labels through localization messages", () => {
    [
      "usePowerEditorLocale()",
      "messages.inspector.pageBackground",
      "messages.inspector.coverBanner",
      "messages.inspector.profile",
      "messages.inspector.containerLayout",
      "messages.inspector.videoIdOrUrl",
      "messages.inspector.backgroundOverride",
      "messages.inspector.decorativeFrame",
      "messages.inspector.layoutConstraints",
      "messages.inspector.positioningOverrides",
      "messages.inspector.behaviorOverrides",
      "formatBreakpoint(locale, breakpoint)",
    ].forEach((contract) => {
      expect(inspectorSource).toContain(contract);
    });
  });

  it("does not translate canonical enum/internal values", () => {
    [
      'value: "solid"',
      'value: "gradient"',
      'value: "image"',
      'value: "pattern"',
      'value: "contained"',
      'value: "full-bleed"',
      'value: "left"',
      'value: "center"',
      'value: "right"',
      'value: "stack"',
      'value: "grid"',
      'value: "bento"',
      'value: "start"',
      'value: "stretch"',
      'patch("profile.banner.widthMode", v)',
      'patch("profile.verified", v)',
    ].forEach((contractValue) => {
      expect(profileInspectorSource).toContain(contractValue);
    });
  });
});
