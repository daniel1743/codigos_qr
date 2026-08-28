import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CompositionRenderer } from "./CompositionRenderer";
import { hydrateCompositionPageConfig } from "../lib/compositionModel";
import { getBlock, type Breakpoint, type PageConfig } from "../lib/editorCandidateModel";
import { CanvasBlock } from "../pages/EditorCandidate";
import "./power-editor-template-preview.css";

type Props = {
  config: PageConfig;
  deviceMode?: "mobile" | "desktop" | "thumbnail";
};

export function PowerEditorTemplatePreview({ config, deviceMode = "mobile" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const page = useMemo(() => hydrateCompositionPageConfig(config), [config]);
  const breakpoint: Breakpoint = deviceMode === "desktop" ? "desktop" : "mobile";
  const background = page.background.gradient
    ? `linear-gradient(${page.background.angle}deg, ${page.background.base}, ${page.background.gradientEnd})`
    : page.background.base;
  const bannerHeight = Number(getBlock(page, "banner")?.props.height ?? 126);
  const canvasStyle = useMemo(() => ({
    background,
    "--ep-font": page.theme.fontFamily,
    "--ep-title-size": `${page.theme.fontSize}px`,
    "--ep-title-weight": page.theme.fontWeight,
    "--ep-title-color": page.theme.titleColor,
    "--ep-button-color": page.theme.buttonColor,
    "--ep-button-radius": `${page.theme.buttonRadius}px`,
    "--ep-button-gap": `${page.theme.buttonGap}px`,
    "--ep-title-shadow": `${page.theme.titleShadow}px`,
    "--ep-banner-height": `${bannerHeight}px`,
    "--ep-pattern-color": page.background.patternColor,
    "--ep-pattern-opacity": page.background.patternOpacity / 100,
  } as CSSProperties), [background, bannerHeight, page]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateScale = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      const next = deviceMode === "thumbnail"
        ? Math.max(width / 390, height / 690)
        : Math.min((width - 16) / 390, (height - 16) / 690, 1);
      setScale(Math.max(.1, next));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [deviceMode]);

  return (
    <div ref={containerRef} className={`ep-power-gallery-preview is-${deviceMode}`}>
      <div className="ep-power-gallery-frame" style={{ transform: `scale(${scale})` }}>
        <div className={`ep-template ep-view-${breakpoint} ep-pattern-${page.background.pattern} ep-texture-${page.background.texture} ep-light-${page.background.light}`} style={canvasStyle}>
          <CompositionRenderer
            page={page}
            composition={page.composition}
            breakpoint={breakpoint}
            renderBlock={(block) => (
              <CanvasBlock
                key={block.id}
                block={block}
                page={page}
                breakpoint={breakpoint}
                selected={false}
                onSelect={() => undefined}
                preview
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
