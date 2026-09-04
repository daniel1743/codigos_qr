import { useEffect, useState } from "react";
import type { BioTemplateConfig, Breakpoint } from "../types";
import { TemplateRenderer } from "./TemplateRenderer";
import "../styles/studio.css";

/**
 * PUBLIC RENDERER
 * Production surface for a published bio page: no editor, no inspector,
 * no drag & drop, no history. Same engine as the canvas, so
 * WHAT YOU SEE === WHAT YOU PUBLISH.
 */
export interface PublicTemplateRendererProps {
  config: BioTemplateConfig;
  /** override the auto-detected breakpoint (useful for SSR) */
  breakpoint?: Breakpoint | undefined;
  /** ANALYTICS ADAPTER hook */
  onTrack?:
    | ((event: { type: string; blockId?: string | undefined; url?: string | undefined }) => void)
    | undefined;
}

function useBreakpoint(initial: Breakpoint = "desktop"): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(initial);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setBp(w < 768 ? "mobile" : w < 1100 ? "tablet" : "desktop");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return bp;
}

export function PublicTemplateRenderer({
  config,
  breakpoint,
  onTrack,
}: PublicTemplateRendererProps) {
  const detected = useBreakpoint(breakpoint ?? "desktop");
  return (
    <TemplateRenderer
      config={config}
      breakpoint={breakpoint ?? detected}
      mode="public"
      onTrack={onTrack}
      style={{ minHeight: "100vh" }}
    />
  );
}
