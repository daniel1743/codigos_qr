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
  deviceMode?: "mobile" | "desktop" | "fluid" | "thumbnail";
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

  const frameSize = (deviceMode === "mobile" || deviceMode === "thumbnail")
    ? { width: 375, height: 812 }
    : deviceMode === "desktop" 
      ? { width: 1024, height: 720 }
      : { width: '100%', height: '100%' };

  useEffect(() => {
    if (deviceMode === "fluid") return;
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      
      let nextScale;
      if (deviceMode === "thumbnail") {
        // object-cover behavior for thumbnail (fill width and crop bottom if needed)
        nextScale = Math.max(
          width / (frameSize.width as number),
          height / (frameSize.height as number)
        );
      } else {
        // object-contain behavior for admin view
        const padding = 16;
        nextScale = Math.min(
          (width - padding) / (frameSize.width as number),
          (height - padding) / (frameSize.height as number),
          1,
        );
      }
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
      ? "shadow-2xl rounded-3xl overflow-hidden border-8 border-gray-900 bg-white origin-center"
      : deviceMode === "desktop"
      ? "shadow-lg rounded-lg overflow-hidden border bg-white origin-center"
      : deviceMode === "thumbnail"
      ? "bg-white origin-top"
      : "w-full h-full bg-white origin-top-left";

  return (
    <div
      ref={containerRef}
      className={`flex w-full overflow-hidden ${deviceMode === 'thumbnail' ? 'h-full items-start justify-center' : 'h-full min-h-0 items-center justify-center'} ${className}`}
    >
      <style>{`
        .force-preview-height > div {
          min-height: 100% !important;
          display: flex;
          flex-direction: column;
        }
      `}</style>
      <div
        className={"transition-transform duration-200 " + frameClass}
        style={deviceMode === "fluid" ? { width: '100%', height: '100%' } : {
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
