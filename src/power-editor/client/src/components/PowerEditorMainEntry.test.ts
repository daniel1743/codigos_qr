import { describe, expect, it } from "vitest";
import {
  createInitialMainPowerEditorConfig,
  selectPrimaryPowerEditorProject,
} from "./PowerEditorMainEntry";

describe("PowerEditorMainEntry", () => {
  it("prioriza un borrador editable sobre un proyecto publicado", () => {
    const project = selectPrimaryPowerEditorProject([
      { id: "published", status: "published" as const },
      { id: "draft", status: "draft" as const },
    ]);
    expect(project?.id).toBe("draft");
  });

  it("no selecciona proyectos archivados y clona una receta V6 para un nuevo borrador", () => {
    expect(selectPrimaryPowerEditorProject([{ id: "archived", status: "archived" as const }])).toBeNull();
    const first = createInitialMainPowerEditorConfig();
    const second = createInitialMainPowerEditorConfig();
    expect(first.version).toBe(6);
    expect(first.blocks.length).toBeGreaterThan(0);
    expect(first).not.toBe(second);
  });
});
