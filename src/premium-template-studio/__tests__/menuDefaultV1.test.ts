import { describe, expect, it } from "vitest";
import { createPageStarterConfig } from "../../components/power-editor/pageStarterConfig";
import { getTemplateDefinition } from "../templates/definitions";

describe("menu-default-v1 approved reference starter", () => {
  it("keeps the approved reference fingerprint and menu defaults", () => {
    const config = getTemplateDefinition("menu-default-v1").build();

    expect(config.metadata.templateDefinitionId).toBe("menu-default-v1");
    expect(config.theme.id).toBe("aurora");
    expect(config.layout.id).toBe("centered");
    expect(config.blocks).toHaveLength(4);
    expect(config.blocks.map((block) => block.type)).toEqual([
      "buttonGroup",
      "heading",
      "productGrid",
      "contact",
    ]);
    expect(config.profile.name).toBe("DONDE MI NEGRO");
    expect(config.profile.showAvatar).toBe(false);
    expect(config.profile.banner.widthMode).toBe("full-bleed");
    expect(config.profile.banner.imageUrl).toContain(
      "supabase.co/storage/v1/object/public/avatars/",
    );
  });

  it("uses the new page title as identity without replacing menu copy", () => {
    const config = createPageStarterConfig("QA Menu Reference Clone", "menu");

    expect(config.metadata.templateDefinitionId).toBe("menu-default-v1");
    expect(config.metadata.name).toBe("QA Menu Reference Clone");
    expect(config.profile.name).toBe("QA Menu Reference Clone");
    expect(config.blocks.find((block) => block.type === "heading")?.content.title).toBe(
      "Nuestro menú",
    );
    expect(config.profile.name).not.toBe("DONDE MI NEGRO");
  });
});
