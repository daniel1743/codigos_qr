import { useEffect, useState } from "react";
import type { BioTemplateConfig, SaveState } from "../types";

export type PersistenceOperation = "autosave" | "manual-save" | "publish";
export type PersistenceDebugStage =
  | "PROFILE_CONTEXT"
  | "STUDIO_CURRENT"
  | "SAVE_START"
  | "SAVE_SUCCESS"
  | "SAVE_ERROR"
  | "PUBLISH_START"
  | "PRE_PUBLISH_SAVE_SUCCESS"
  | "PUBLISH_SUCCESS"
  | "PUBLISH_ERROR"
  | "READBACK_DRAFT"
  | "READBACK_PUBLISHED"
  | "READBACK_ERROR"
  | "STATUS";

export interface PersistenceConfigSummary {
  fingerprint: string;
  pageInstanceId: string | null;
  templateDefinitionId: string | null;
  blockCount: number;
  blockTypes: string[];
}

export interface PersistenceDebugEvent {
  stage: PersistenceDebugStage;
  timestamp?: number;
  operation?: PersistenceOperation;
  profileId?: string;
  publicId?: string;
  revision?: number;
  status?: SaveState;
  config?: PersistenceConfigSummary;
  expectedFingerprint?: string;
  comparison?: "match" | "mismatch" | "missing";
  errorCategory?: "save" | "publish" | "readback";
}

interface PersistenceDebugSnapshot {
  profileId: string | null;
  publicId: string | null;
  studio: PersistenceConfigSummary | null;
  autosave: PersistenceConfigSummary | null;
  dbDraft: PersistenceConfigSummary | null;
  publish: PersistenceConfigSummary | null;
  dbPublished: PersistenceConfigSummary | null;
  status: SaveState | null;
  comparison: "match" | "mismatch" | "missing" | null;
}

const emptySnapshot = (): PersistenceDebugSnapshot => ({
  profileId: null,
  publicId: null,
  studio: null,
  autosave: null,
  dbDraft: null,
  publish: null,
  dbPublished: null,
  status: null,
  comparison: null,
});

let snapshot = emptySnapshot();
const listeners = new Set<(event: PersistenceDebugEvent) => void>();

export function isPersistenceDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  return new URLSearchParams(window.location.search).get("persistenceDebug") === "1";
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(",")}}`;
}

function fingerprint(value: unknown): string {
  let hash = 0x811c9dc5;
  const serialized = stableSerialize(value);

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function describePersistenceConfig(config: BioTemplateConfig): PersistenceConfigSummary {
  const blockTypes = Array.from(new Set(config.blocks.map((block) => block.type))).sort();

  return {
    fingerprint: fingerprint(config),
    pageInstanceId: config.pageInstanceId ?? null,
    templateDefinitionId: config.templateDefinitionId ?? null,
    blockCount: config.blocks.length,
    blockTypes,
  };
}

export function recordPersistenceDebugEvent(event: PersistenceDebugEvent): void {
  if (!isPersistenceDebugEnabled()) return;

  const recordedEvent = { ...event, timestamp: event.timestamp ?? Date.now() };
  snapshot = {
    ...snapshot,
    profileId: recordedEvent.profileId ?? snapshot.profileId,
    publicId: recordedEvent.publicId ?? snapshot.publicId,
    studio:
      recordedEvent.stage === "STUDIO_CURRENT"
        ? (recordedEvent.config ?? snapshot.studio)
        : snapshot.studio,
    autosave:
      recordedEvent.operation === "autosave" &&
      (recordedEvent.stage === "SAVE_START" || recordedEvent.stage === "SAVE_SUCCESS")
        ? (recordedEvent.config ?? snapshot.autosave)
        : snapshot.autosave,
    dbDraft:
      recordedEvent.stage === "READBACK_DRAFT" ? (recordedEvent.config ?? null) : snapshot.dbDraft,
    publish:
      recordedEvent.stage === "PUBLISH_START" || recordedEvent.stage === "PUBLISH_SUCCESS"
        ? (recordedEvent.config ?? snapshot.publish)
        : snapshot.publish,
    dbPublished:
      recordedEvent.stage === "READBACK_PUBLISHED"
        ? (recordedEvent.config ?? null)
        : snapshot.dbPublished,
    status: recordedEvent.stage === "STATUS" ? (recordedEvent.status ?? null) : snapshot.status,
    comparison: recordedEvent.comparison ?? snapshot.comparison,
  };

  console.info("[PowerPersistenceDebug]", recordedEvent);
  listeners.forEach((listener) => listener(recordedEvent));
}

export function subscribePersistenceDebug(
  listener: (event: PersistenceDebugEvent) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPersistenceDebugSnapshot(): PersistenceDebugSnapshot {
  return snapshot;
}

export function resetPersistenceDebugForTests(): void {
  snapshot = emptySnapshot();
  listeners.clear();
}

function abbreviated(value: string | null): string {
  if (!value) return "-";
  return value.length <= 12 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function fingerprintValue(config: PersistenceConfigSummary | null): string {
  return config?.fingerprint ?? "-";
}

export function PersistenceDebugPanel() {
  const [debugSnapshot, setDebugSnapshot] = useState(getPersistenceDebugSnapshot);

  useEffect(
    () => subscribePersistenceDebug(() => setDebugSnapshot(getPersistenceDebugSnapshot())),
    [],
  );

  if (!isPersistenceDebugEnabled()) return null;

  return (
    <aside
      aria-label="Persistence debug"
      className="pointer-events-none fixed bottom-[4.5rem] left-3 z-[70] max-w-[13rem] rounded-md border border-slate-500/50 bg-slate-950/90 px-2 py-1.5 font-mono text-[10px] leading-4 text-slate-100 shadow-lg"
    >
      <div className="font-semibold text-cyan-200">Persistence debug</div>
      <div>profile {abbreviated(debugSnapshot.profileId)}</div>
      <div>page {abbreviated(debugSnapshot.publicId)}</div>
      <div>studio {fingerprintValue(debugSnapshot.studio)}</div>
      <div>autosave {fingerprintValue(debugSnapshot.autosave)}</div>
      <div>db draft {fingerprintValue(debugSnapshot.dbDraft)}</div>
      <div>publish {fingerprintValue(debugSnapshot.publish)}</div>
      <div>db published {fingerprintValue(debugSnapshot.dbPublished)}</div>
      <div>
        status {debugSnapshot.status ?? "-"}
        {debugSnapshot.comparison ? ` / ${debugSnapshot.comparison}` : ""}
      </div>
    </aside>
  );
}
