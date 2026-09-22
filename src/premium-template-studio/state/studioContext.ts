import { createContext } from "react";
import type { ReactNode } from "react";
import type { BioTemplateConfig, Breakpoint, SaveState } from "../types";
import type { StudioAdapters } from "../adapters";
import type { ProductTier } from "../../lib/product-entitlements/capabilities";
import type { StudioAction, StudioState } from "./templateReducer";

export type StudioPanel = "blocks" | "design" | "templates" | "settings";

export interface StudioContextValue {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  tier: ProductTier;
  adapters: StudioAdapters;
  breakpoint: Breakpoint;
  setBreakpoint: (b: Breakpoint) => void;
  panel: StudioPanel;
  setPanel: (p: StudioPanel) => void;
  previewing: boolean;
  setPreviewing: (v: boolean) => void;
  saveState: SaveState;
  error: string | null;
  save: () => Promise<void>;
  publish: () => Promise<void>;
}

/** Kept in its own non-component module so HMR never swaps the context identity. */
export const StudioContext = createContext<StudioContextValue | null>(null);

export interface StudioProviderProps {
  initialConfig: BioTemplateConfig;
  adapters?: Partial<StudioAdapters> | undefined;
  autoSave?: boolean | undefined;
  onChange?: ((config: BioTemplateConfig) => void) | undefined;
  onSave?: ((config: BioTemplateConfig) => void | Promise<void>) | undefined;
  onPublish?: ((config: BioTemplateConfig) => void | Promise<void>) | undefined;
  documentId?: string | undefined;
  onSaveStateChange?: ((state: SaveState) => void) | undefined;
  tier?: ProductTier | undefined;
  children: ReactNode;
}
