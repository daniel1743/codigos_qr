import type { BasicTemplateContent, TemplateDefinition } from "@/types/basic-templates";
import { BasicTemplateRenderer } from "../basic-template/BasicTemplateRenderer";
import { buildConfig } from "@/lib/basic-templates/config";

const BASE_WIDTH = 360;
const BASE_HEIGHT = 760;

interface TemplateThumbnailProps {
  template: TemplateDefinition;
  content: BasicTemplateContent;
  width?: number;
}

/**
 * Reuses the REAL renderer at a reduced scale — no second visual
 * implementation (per thumbnail rules).
 */
export function TemplateThumbnail({ template, content, width = 132 }: TemplateThumbnailProps) {
  const scale = width / BASE_WIDTH;
  const config = buildConfig(template, content);

  return (
    <div
      className="pointer-events-none select-none overflow-hidden rounded-xl border bg-white"
      style={{ width, height: Math.round(BASE_HEIGHT * scale) }}
    >
      <div
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "hidden",
        }}
      >
        <BasicTemplateRenderer config={config} />
      </div>
    </div>
  );
}
