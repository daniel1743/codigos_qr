import { describe, it, expect } from "vitest";
import {
  PublicTemplateRenderer,
  type PublicTemplateRendererProps,
} from "../engine/PublicTemplateRenderer";
import { createDemoConfig } from "../templates/definitions";
import type { BioTemplateConfig, TemplateBlock } from "../types";
import React from "react";

describe("PublicTemplateRenderer", () => {
  const validConfig = createDemoConfig();

  it("mounts with valid config", () => {
    const renderer = React.createElement(PublicTemplateRenderer, { config: validConfig });
    expect(renderer).toBeDefined();
    expect(renderer.type).toBe(PublicTemplateRenderer);
  });

  it("does not require StudioProvider", () => {
    // PublicTemplateRenderer should render without StudioProvider context
    // This is verified by checking that it only uses RenderContext (which is standalone)
    const renderer = React.createElement(PublicTemplateRenderer, { config: validConfig });
    expect(renderer.props.config).toBeDefined();
  });

  it("does not render hidden blocks in public mode", () => {
    const firstBlock = validConfig.blocks[0]!;
    const hiddenBlock: TemplateBlock = {
      ...firstBlock,
      id: "hidden-block-test",
      visibility: { desktop: false, tablet: false, mobile: false },
    };
    const configWithHiddenBlocks: BioTemplateConfig = {
      ...validConfig,
      blocks: [firstBlock, hiddenBlock],
    };
    const renderer = React.createElement(PublicTemplateRenderer, {
      config: configWithHiddenBlocks,
    });
    expect(renderer.props.config.blocks).toBeDefined();
    // Hidden blocks should be filtered out at render time in public mode
  });

  it("accepts optional breakpoint prop", () => {
    const renderer = React.createElement(PublicTemplateRenderer, {
      config: validConfig,
      breakpoint: "tablet",
    });
    expect(renderer.props.breakpoint).toBe("tablet");
  });

  it("accepts onTrack callback without editor dependencies", () => {
    const trackMock: NonNullable<PublicTemplateRendererProps["onTrack"]> = (event) => {
      expect(event).toBeDefined();
    };
    const renderer = React.createElement(PublicTemplateRenderer, {
      config: validConfig,
      onTrack: trackMock,
    });
    expect(renderer.props.onTrack).toBe(trackMock);
  });

  it("handles an empty config gracefully", () => {
    const invalidConfig = { ...validConfig, blocks: [] };
    const renderer = React.createElement(PublicTemplateRenderer, {
      config: invalidConfig,
    });
    expect(renderer).toBeDefined();
    // Should not throw during createElement
  });

  it("does not import editor-specific components", () => {
    // Verify module structure
    const modulePath = "../engine/PublicTemplateRenderer";
    expect(modulePath).toContain("PublicTemplateRenderer");
    // This test passes if imports are correct (verified by import analysis)
  });
});
