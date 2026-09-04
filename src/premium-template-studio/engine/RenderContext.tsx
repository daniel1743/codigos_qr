import { createContext, useContext } from "react";
import type { Breakpoint, TemplateTheme } from "../types";

/**
 * Render-time context shared by every block. The public renderer supplies a
 * minimal, edit-free version so no editor code ships to end users.
 */
export interface RenderContextValue {
  theme: TemplateTheme;
  breakpoint: Breakpoint;
  mode: "edit" | "public";
  selectedBlockId?: string | null | undefined;
  onSelectBlock?: ((id: string) => void) | undefined;
  /** inline editing hook: path is dot-notation into the config */
  onInlineEdit?: ((path: string, value: string) => void) | undefined;
  /** ANALYTICS ADAPTER hook */
  onTrack?:
    | ((event: { type: string; blockId?: string | undefined; url?: string | undefined }) => void)
    | undefined;
}

const RenderCtx = createContext<RenderContextValue | null>(null);

export const RenderProvider = RenderCtx.Provider;

export function useRender(): RenderContextValue {
  const ctx = useContext(RenderCtx);
  if (!ctx) throw new Error("Block rendered outside of a TemplateRenderer");
  return ctx;
}
