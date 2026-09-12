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
import type { ProductTier } from "../../lib/product-entitlements/capabilities";
import { isProductTier } from "../../lib/product-entitlements/capabilities";
import {
  authorizeCanonicalMutation,
  verifyMutationPreservation,
} from "../../lib/product-entitlements/mutation-guard";
import { mutationIntentForAction } from "../entitlements";
import {
  describePersistenceConfig,
  recordPersistenceDebugEvent,
} from "../diagnostics/persistenceDebug";

export type StudioPanel = "blocks" | "design" | "templates" | "settings";

interface StudioContextValue {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  /** Effective product tier (fail-closed "free" when missing/invalid). */
  tier: ProductTier;
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
  /** Stable document identity (e.g. profile id) used to isolate saves per document. */
  documentId?: string | undefined;
  /** Reports save-state changes (idle/saving/saved/dirty/error) to the host. */
  onSaveStateChange?: ((state: SaveState) => void) | undefined;
  /** Effective product tier from the host boundary. Missing/invalid → "free". */
  tier?: ProductTier | undefined;
  children: ReactNode;
}

export function StudioProvider({
  initialConfig,
  adapters: adapterOverrides,
  autoSave = true,
  onChange,
  onSave,
  onPublish,
  documentId,
  onSaveStateChange,
  tier,
  children,
}: StudioProviderProps) {
  const adapters = useMemo(() => resolveAdapters(adapterOverrides), [adapterOverrides]);
  const [state, rawDispatch] = useReducer(templateReducer, initialConfig, createInitialState);

  // Fail closed: a missing/invalid tier is treated no more permissively than Free.
  const effectiveTier: ProductTier = useMemo(() => (isProductTier(tier) ? tier : "free"), [tier]);

  // GUARDED DISPATCH — the single shared mutation boundary.
  //
  //   construct intent → authorize → (DENY: no-op)
  //                            → (ALLOW: compute candidate → verify preservation
  //                              → invalid: reject | valid: apply)
  //
  // Full-replacement actions (replaceConfig) and non-mutations (select/undo/redo/
  // markSaved) carry no intent and pass through untouched.
  const dispatch = useCallback(
    (action: StudioAction) => {
      const intent = mutationIntentForAction(state, action);
      if (!intent) {
        rawDispatch(action);
        return;
      }
      const authorization = authorizeCanonicalMutation(effectiveTier, intent);
      if (authorization.decision === "DENY") return;
      const candidate = templateReducer(state, action);
      const preservation = verifyMutationPreservation(
        state.config,
        candidate.config,
        effectiveTier,
        intent,
      );
      if (!preservation.valid) return;
      rawDispatch(action);
    },
    [state, effectiveTier, rawDispatch],
  );
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [panel, setPanel] = useState<StudioPanel>("blocks");
  const [previewing, setPreviewing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SAVE COORDINATOR — document identity + local revision tracking so stale or
  // cross-document responses can never acknowledge the wrong snapshot.
  const documentIdRef = useRef(documentId);
  const revisionRef = useRef(0);
  const lastSavedRevisionRef = useRef(0);

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

  // Keep the coordinator mirrors current, and restart the saved-revision
  // watermark whenever the document identity changes.
  useEffect(() => {
    documentIdRef.current = documentId;
    lastSavedRevisionRef.current = 0;
  }, [documentId]);

  useEffect(() => {
    revisionRef.current = state.revision;
  }, [state.revision]);

  // Surface save-state changes to the host (Saved / Saving / Unsaved / Error).
  useEffect(() => {
    onSaveStateChange?.(saveState);
    recordPersistenceDebugEvent({
      stage: "STATUS",
      profileId: documentId,
      status: saveState,
    });
  }, [saveState, onSaveStateChange]);

  const save = useCallback(
    async (reason: "autosave" | "manual-save" = "manual-save") => {
      // Capture an immutable snapshot tied to the exact document + revision.
      const snapshot = state.config;
      const snapshotRevision = state.revision;
      const snapshotDocumentId = documentId;
      const configSummary = describePersistenceConfig(snapshot);
      recordPersistenceDebugEvent({
        stage: "SAVE_START",
        operation: reason,
        profileId: snapshotDocumentId,
        revision: snapshotRevision,
        config: configSummary,
      });
      setSaveState("saving");
      setError(null);
      try {
        await adapters.storage.save(snapshot);
        await onSave?.(snapshot);
        recordPersistenceDebugEvent({
          stage: "SAVE_SUCCESS",
          operation: reason,
          profileId: snapshotDocumentId,
          revision: snapshotRevision,
          config: configSummary,
        });
        // Acknowledge only if (a) we are still on the same document and (b) this
        // revision is not older than the last acknowledged one (monotonic).
        if (
          snapshotDocumentId === documentIdRef.current &&
          snapshotRevision >= lastSavedRevisionRef.current
        ) {
          lastSavedRevisionRef.current = snapshotRevision;
          dispatch({ type: "markSaved", revision: snapshotRevision });
        }
        // If newer edits arrived while saving, stay "dirty" — never "saved".
        setSaveState(
          snapshotDocumentId === documentIdRef.current && revisionRef.current > snapshotRevision
            ? "dirty"
            : "saved",
        );
      } catch (err) {
        recordPersistenceDebugEvent({
          stage: "SAVE_ERROR",
          operation: reason,
          profileId: snapshotDocumentId,
          revision: snapshotRevision,
          config: configSummary,
          errorCategory: "save",
        });
        setError(err instanceof Error ? err.message : "Could not save the template.");
        setSaveState("error");
      }
    },
    [adapters.storage, state.config, state.revision, documentId, onSave],
  );

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
    const snapshot = state.config;
    const snapshotRevision = state.revision;
    const snapshotDocumentId = documentId;
    const configSummary = describePersistenceConfig(snapshot);
    recordPersistenceDebugEvent({
      stage: "PUBLISH_START",
      operation: "publish",
      profileId: snapshotDocumentId,
      revision: snapshotRevision,
      config: configSummary,
    });
    setSaveState("saving");
    setError(null);
    try {
      await adapters.storage.save(snapshot);
      recordPersistenceDebugEvent({
        stage: "PRE_PUBLISH_SAVE_SUCCESS",
        operation: "publish",
        profileId: snapshotDocumentId,
        revision: snapshotRevision,
        config: configSummary,
      });
      await adapters.storage.publish?.(snapshot);
      await onPublish?.(snapshot);
      recordPersistenceDebugEvent({
        stage: "PUBLISH_SUCCESS",
        operation: "publish",
        profileId: snapshotDocumentId,
        revision: snapshotRevision,
        config: configSummary,
      });
      if (
        snapshotDocumentId === documentIdRef.current &&
        snapshotRevision >= lastSavedRevisionRef.current
      ) {
        lastSavedRevisionRef.current = snapshotRevision;
        dispatch({ type: "markSaved", revision: snapshotRevision });
      }
      setSaveState(
        snapshotDocumentId === documentIdRef.current && revisionRef.current > snapshotRevision
          ? "dirty"
          : "saved",
      );
    } catch (err) {
      recordPersistenceDebugEvent({
        stage: "PUBLISH_ERROR",
        operation: "publish",
        profileId: snapshotDocumentId,
        revision: snapshotRevision,
        config: configSummary,
        errorCategory: "publish",
      });
      setError(err instanceof Error ? err.message : "Could not publish the template.");
      setSaveState("error");
    }
  }, [adapters.storage, state.config, state.revision, documentId, onPublish]);

  // Autosave, debounced. The host can disable it and drive saving itself.
  useEffect(() => {
    lastEmittedConfig.current = state.config;
    onChange?.(state.config);
    recordPersistenceDebugEvent({
      stage: "STUDIO_CURRENT",
      profileId: documentId,
      revision: state.revision,
      config: describePersistenceConfig(state.config),
    });
    if (!autoSave || !state.dirty) return;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save("autosave"), 900);
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
      tier: effectiveTier,
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
    [
      state,
      dispatch,
      effectiveTier,
      adapters,
      breakpoint,
      panel,
      previewing,
      saveState,
      error,
      save,
      publish,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
