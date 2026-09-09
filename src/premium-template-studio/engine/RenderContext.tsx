import { createContext, useContext } from "react";
import type { Breakpoint, TemplateTheme } from "../types";

/** Editable Hero text sub-targets (parent block + Inspector focus, not blocks). */
export type HeroTextTarget = "title" | "subtitle" | "description" | "eyebrow";

/** Profile sub-targets (cover/avatar/bio) — ephemeral contextual UI targets. */
export type ProfileTarget = "profile-cover" | "profile-avatar" | "profile-bio";

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
  /** Selecting the profile cover/banner (contextual navigation — not a block). */
  onSelectProfileCover?: (() => void) | undefined;
  /** Generalized Profile contextual selection (cover/avatar/bio) — not a block. */
  onSelectProfileTarget?: ((target: ProfileTarget) => void) | undefined;
  /** Selecting a Hero CTA sub-target (parent block id + focus, not a new block). */
  onSelectHeroCta?: ((blockId: string) => void) | undefined;
  /** Selecting a Hero text sub-target (title/subtitle/description/eyebrow). */
  onSelectHeroText?: ((blockId: string, target: HeroTextTarget) => void) | undefined;
  /** Selecting the Hero foreground/media image (parent block id + focus). */
  onSelectHeroImage?: ((blockId: string) => void) | undefined;
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
