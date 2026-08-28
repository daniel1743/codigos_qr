import { describe, expect, it } from "vitest";
import { mapTemplateToPublicViewModel, type TemplateConfig } from "./template.service";

describe("template gallery mapping", () => {
  it("keeps private Power Editor submissions marked as premium", () => {
    const template: TemplateConfig = {
      id: "template-1",
      name: "Premium local",
      config_json: {
        version: 6,
        profile: "premium",
        capabilities: { allowAdvancedStyles: true },
        blocks: [],
      },
      template_type: "private",
      is_public: false,
      publication_status: "GENERATED_PRIVATE",
      usage_count: 0,
      created_by: "user-1",
      created_at: "2026-08-28T00:00:00.000Z",
      updated_at: "2026-08-28T00:00:00.000Z",
    };

    const mapped = mapTemplateToPublicViewModel(template);

    expect(mapped.plan).toBe("premium");
    expect(mapped.status).toBe("GENERATED_PRIVATE");
    expect(mapped.createdBy).toBe("user-1");
  });
});
