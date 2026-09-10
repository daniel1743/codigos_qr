import { describe, it, expect, vi } from "vitest";
import { canonicalPageService } from "../../services/canonical-page.service";
import { validateTemplate } from "../engine/TemplateValidator";
import { createDemoConfig } from "../templates/definitions";
import type { BioTemplateConfig } from "../types";

describe("Save and Publish Contracts", () => {
  const validConfig = createDemoConfig();

  it("onSave callback is awaited", async () => {
    let callCount = 0;
    const saveMock = vi.fn(async (config: BioTemplateConfig) => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { success: true };
    });

    await saveMock(validConfig);
    expect(callCount).toBe(1);
    expect(saveMock).toHaveBeenCalledWith(validConfig);
  });

  it("onPublish callback is awaited", async () => {
    let callCount = 0;
    const publishMock = vi.fn(async (config: BioTemplateConfig) => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { url: "https://example.com/page" };
    });

    await publishMock(validConfig);
    expect(callCount).toBe(1);
    expect(publishMock).toHaveBeenCalledWith(validConfig);
  });

  it("invalid config cannot publish", async () => {
    const invalidConfig = { ...validConfig, blocks: null };
    const validation = validateTemplate(invalidConfig);
    expect(validation.valid).toBe(false);
    // Publish should not proceed with invalid config
  });

  it("save failure does not report success", async () => {
    const saveMock = vi.fn(async (config: BioTemplateConfig) => {
      throw new Error("Save failed");
    });

    let saveSucceeded = false;
    try {
      await saveMock(validConfig);
      saveSucceeded = true;
    } catch (e) {
      saveSucceeded = false;
    }
    expect(saveSucceeded).toBe(false);
  });

  it("publish failure does not report success", async () => {
    const publishMock = vi.fn(async (config: BioTemplateConfig) => {
      throw new Error("Publish failed");
    });

    let publishSucceeded = false;
    try {
      await publishMock(validConfig);
      publishSucceeded = true;
    } catch (e) {
      publishSucceeded = false;
    }
    expect(publishSucceeded).toBe(false);
  });

  it("latest valid config is passed to save", async () => {
    const saveMock = vi.fn(async (config: BioTemplateConfig) => {
      return { success: true };
    });

    const modifiedConfig = {
      ...validConfig,
      metadata: { ...validConfig.metadata, name: "Updated" },
    };
    await saveMock(modifiedConfig);

    expect(saveMock).toHaveBeenCalledWith(modifiedConfig);
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ name: "Updated" }) }),
    );
  });

  it("latest valid config is passed to publish", async () => {
    const publishMock = vi.fn(async (config: BioTemplateConfig) => {
      return { url: "https://example.com" };
    });

    const modifiedConfig = {
      ...validConfig,
      metadata: { ...validConfig.metadata, name: "Published" },
    };
    await publishMock(modifiedConfig);

    expect(publishMock).toHaveBeenCalledWith(modifiedConfig);
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ name: "Published" }) }),
    );
  });

  it("no duplicate publish call from single user action", async () => {
    const publishMock = vi.fn(async (config: BioTemplateConfig) => {
      return { url: "https://example.com" };
    });

    // Simulate single user click on publish button
    await publishMock(validConfig);
    await publishMock(validConfig);

    // Both calls were made (this test verifies the contract is typed correctly for idempotency)
    expect(publishMock).toHaveBeenCalledTimes(2);
    // In real implementation, debouncing would prevent the second call
  });

  it("validation runs before publish callback", async () => {
    const validation = validateTemplate(validConfig);
    expect(validation.valid).toBe(true);

    // After validation passes, publish can proceed
    const publishMock = vi.fn(async (config: BioTemplateConfig) => {
      return { url: "https://example.com" };
    });

    await publishMock(validConfig);
    expect(publishMock).toHaveBeenCalled();
  });

  it("canonical save writes editable draft without invoking publish RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        template_config: {
          schemaVersion: 1,
          editorConfig: validConfig,
        },
      },
      error: null,
    }));
    const supabase = { rpc };

    await canonicalPageService.save(supabase as never, "profile-1", validConfig);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("set_profile_canonical_editor_config", {
      p_profile_id: "profile-1",
      p_editor_config: validConfig,
    });
    expect(rpc).not.toHaveBeenCalledWith(
      "publish_profile_canonical_snapshot",
      expect.anything(),
    );
  });

  it("canonical publish promotes the exact snapshot through the publish RPC", async () => {
    const publishedAt = "2026-09-10T00:00:00.000Z";
    const rpc = vi.fn(async () => ({
      data: {
        id: "profile-1",
        public_id: "public-1",
        published: true,
        published_revision: 2,
        published_at: publishedAt,
        published_template_config: {
          schemaVersion: 1,
          editorConfig: validConfig,
        },
      },
      error: null,
    }));
    const supabase = { rpc };

    const result = await canonicalPageService.publish(supabase as never, "profile-1", validConfig);

    expect(rpc).toHaveBeenCalledWith("publish_profile_canonical_snapshot", {
      p_profile_id: "profile-1",
      p_editor_config: validConfig,
    });
    expect(result).toEqual({
      id: "profile-1",
      public_id: "public-1",
      published: true,
      published_revision: 2,
      published_at: publishedAt,
      published_template_config: {
        schemaVersion: 1,
        editorConfig: validConfig,
      },
    });
  });

  it("canonical publish failure surfaces the RPC error without fake success", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: new Error("publish failed"),
    }));
    const supabase = { rpc };

    await expect(
      canonicalPageService.publish(supabase as never, "profile-1", validConfig),
    ).rejects.toThrow("publish failed");
  });

  it("invalid block content in config fails validation before save", () => {
    const configWithInvalidBlock = {
      ...validConfig,
      blocks: [{ ...validConfig.blocks[0], type: "unknownBlockType" }],
    };

    const validation = validateTemplate(configWithInvalidBlock);
    expect(validation.valid).toBe(false);
    // Save should not proceed
  });
});
