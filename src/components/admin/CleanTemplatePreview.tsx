/**
 * TF-F8: CleanTemplatePreview
 *
 * Renders a TemplateConfig exactly as an end user / public visitor
 * would see it — no editor chrome, no Canvas Engine Studio UI.
 *
 * Uses the same PublicProfileView renderer as the production /p/:publicId route.
 *
 * Props:
 *   - config:      The TemplateConfig (template_bank.config_json)
 *   - deviceMode:  "mobile" | "desktop"
 *   - interactive: false (default) = pointer-events-none for safe preview
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PublicProfileView } from "../profile/PublicProfileView";
import { templateConfigToPreviewData } from "../../lib/template-factory/preview";
import type { TemplateConfig } from "../../lib/template-factory/config";

interface CleanTemplatePreviewProps {
  config: TemplateConfig;
  deviceMode?: "mobile" | "desktop";
  interactive?: boolean;
  className?: string;
}

export function CleanTemplatePreview({
  config,
  deviceMode = "mobile",
  interactive = false,
  className = "",
}: CleanTemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Memoize the mapping so we don't re-map on every render
  const { profile, links } = useMemo(
    () => templateConfigToPreviewData(config),
    [config]
  );

  const frameSize = deviceMode === "mobile"
    ? { width: 375, height: 812 }
    : { width: 1024, height: 720 };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      const padding = 16;
      const nextScale = Math.min(
        (width - padding) / frameSize.width,
        (height - padding) / frameSize.height,
        1,
      );
      setScale(Math.max(0.1, nextScale));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [deviceMode, frameSize.height, frameSize.width]);

  const frameClass =
    deviceMode === "mobile"
      ? "shadow-2xl rounded-3xl overflow-hidden border-8 border-gray-900 bg-white"
      : "shadow-lg rounded-lg overflow-hidden border bg-white";

  return (
    <div
      ref={containerRef}
      className={"flex h-full min-h-0 w-full items-center justify-center overflow-hidden " + className}
    >
      <style>{`
        .force-preview-height > div {
          min-height: 100% !important;
          display: flex;
          flex-direction: column;
        }
      `}</style>
      <div
        className={"transition-transform duration-200 origin-center " + frameClass}
        style={{
          width: frameSize.width,
          height: frameSize.height,
          transform: `scale(${scale})`,
        }}
      >
        <div
          className={
            "h-full w-full overflow-auto hide-scrollbar force-preview-height " +
            (interactive ? "" : "pointer-events-none")
          }
        >
          <PublicProfileView
            profile={profile}
            links={links}
            isPreview={false}
          />
        </div>
      </div>
    </div>
  );
}
