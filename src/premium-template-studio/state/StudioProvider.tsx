import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { BioTemplateConfig, Breakpoint, SaveState } from "../types";
import { createInitialState, templateReducer } from "./templateReducer";
import type { StudioAction, StudioState } from "./templateReducer";
import { resolveAdapters } from "../adapters";
import { validateTemplate } from "../engine/TemplateValidator";
import type { StudioAdapters } from "../adapters";

export type StudioPanel = "blocks" | "design" | "templates" | "settings";

interface StudioContextValue {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  adapters: StudioAdapters;
  breakpoint: Breakpoint;
  setBreakpoint: (b: Breakpoint) => void;
  panel: StudioPanel;
  setPanel: (p: StudioPanel) => void;
  previewing: boolean;
  setPreviewing: (v: boolean) => void;
  saveState: SaveState;
  /** Last save/publish/validation error, if any. */
  error: string | null;
  save: () => Promise<void>;
  publish: () => Promise<void>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside <StudioProvider>");
  return ctx;
}

export interface StudioProviderProps {
  initialConfig: BioTemplateConfig;
  adapters?: Partial<StudioAdapters> | undefined;
  autoSave?: boolean | undefined;
  onChange?: ((config: BioTemplateConfig) => void) | undefined;
  onSave?: ((config: BioTemplateConfig) => void | Promise<void>) | undefined;
  onPublish?: ((config: BioTemplateConfig) => void | Promise<void>) | undefined;
  children: ReactNode;
}

export function StudioProvider({
  initialConfig,
  adapters: adapterOverrides,
  autoSave = true,
  onChange,
  onSave,
  onPublish,
  children,
}: StudioProviderProps) {
  const adapters = useMemo(() => resolveAdapters(adapterOverrides), [adapterOverrides]);
  const [state, dispatch] = useReducer(templateReducer, initialConfig, createInitialState);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [panel, setPanel] = useState<StudioPanel>("blocks");
  const [previewing, setPreviewing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CONFIG SYNC — the host may hand over a new config after mount.
  const mountedConfig = useRef(initialConfig);
  const lastEmittedConfig = useRef<BioTemplateConfig | null>(null);

  useEffect(() => {
    if (mountedConfig.current === initialConfig) return;
    mountedConfig.current = initialConfig;

    // Check if the incoming config is structurally identical to our current state
    const isIdentical =
      initialConfig === state.config ||
      initialConfig === lastEmittedConfig.current ||
      JSON.stringify(initialConfig) === JSON.stringify(state.config);

    if (isIdentical) {
      return;
    }

    dispatch({ type: "replaceConfig", config: initialConfig, resetHistory: true });
  }, [initialConfig, state.config]);

  // Detect a mobile viewport once so the canvas does not open in desktop mode.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 640) setBreakpoint("mobile");
    else if (window.innerWidth < 1024) setBreakpoint("tablet");
  }, []);

  const save = useCallback(async () => {
    setSaveState("saving");
    setError(null);
    try {
      await adapters.storage.save(state.config);
      await onSave?.(state.config);
      dispatch({ type: "markSaved" });
      setSaveState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the template.");
      setSaveState("error");
    }
  }, [adapters.storage, state.config, onSave]);

  const publish = useCallback(async () => {
    // VALIDATION GATE — never publish an invalid configuration.
    const result = validateTemplate(state.config);
    if (!result.valid) {
      const first = result.issues.find((i) => i.level === "error");
      setError(
        `Cannot publish: ${first?.path ?? "config"} — ${first?.message ?? "invalid configuration."}`,
      );
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    setError(null);
    try {
      await adapters.storage.save(state.config);
      await adapters.storage.publish?.(state.config);
      await onPublish?.(state.config);
      dispatch({ type: "markSaved" });
      setSaveState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish the template.");
      setSaveState("error");
    }
  }, [adapters.storage, state.config, onPublish]);

  // Autosave, debounced. The host can disable it and drive saving itself.
  useEffect(() => {
    lastEmittedConfig.current = state.config;
    onChange?.(state.config);
    if (!autoSave || !state.dirty) return;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.config, state.dirty, autoSave]);

  // Keyboard: undo / redo / save / deselect.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
      } else if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      } else if (event.key === "Escape" && !typing) {
        dispatch({ type: "selectBlock", id: null });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const value = useMemo<StudioContextValue>(
    () => ({
      state,
      dispatch,
      adapters,
      breakpoint,
      setBreakpoint,
      panel,
      setPanel,
      previewing,
      setPreviewing,
      saveState,
      error,
      save,
      publish,
    }),
    [state, adapters, breakpoint, panel, previewing, saveState, error, save, publish],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
